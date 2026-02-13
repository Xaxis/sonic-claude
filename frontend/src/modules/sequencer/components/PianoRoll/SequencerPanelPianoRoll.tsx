/**
 * SequencerPanelPianoRoll - Piano roll MIDI editor (bottom panel)
 *
 * Shows when a MIDI clip is selected. Allows visual editing of MIDI notes.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view).
 */

import { useState, useEffect } from "react";
import { X, Trash2, Grid3x3, Save } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { SequencerPanelPianoRollGrid } from "./SequencerPanelPianoRollGrid.tsx";
import { SequencerPanelPianoRollKeyboard } from "./SequencerPanelPianoRollKeyboard.tsx";
import type { MIDIEvent } from "../../types.ts";

interface SequencerPanelPianoRollProps {
    isOpen: boolean;
    clipId: string;
    clipName: string;
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    midiEvents: MIDIEvent[];
    snapEnabled: boolean;
    gridSize: number;
    zoom: number; // Match timeline zoom
    totalBeats: number; // Total composition length in beats
    onClose: () => void;
    onUpdateNotes: (clipId: string, notes: MIDIEvent[]) => void;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function SequencerPanelPianoRoll({
    isOpen,
    clipId,
    clipName,
    clipDuration,
    clipStartTime,
    midiEvents,
    snapEnabled: initialSnapEnabled,
    gridSize: initialGridSize,
    zoom,
    totalBeats,
    onClose,
    onUpdateNotes,
}: SequencerPanelPianoRollProps) {
    const [notes, setNotes] = useState<MIDIEvent[]>(midiEvents);
    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [snapEnabled, setSnapEnabled] = useState(initialSnapEnabled);
    const [gridSize, setGridSize] = useState(initialGridSize);
    const [copiedNotes, setCopiedNotes] = useState<MIDIEvent[]>([]);

    // Piano roll settings - MATCH TIMELINE
    const minPitch = 21; // A0 - Full piano range
    const maxPitch = 108; // C8
    const pixelsPerBeat = 40; // Match timeline's base pixels per beat
    const beatWidth = pixelsPerBeat * zoom; // Apply zoom to match timeline
    const noteHeight = 20; // pixels per note row (taller for better clicking)

    // Update notes when midiEvents prop changes
    useEffect(() => {
        setNotes(midiEvents);
    }, [midiEvents]);

    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    const handleAddNote = (pitch: number, startTime: number) => {
        const newNote: MIDIEvent = {
            note: pitch,
            note_name: getNoteName(pitch),
            start_time: snapEnabled ? Math.round(startTime * gridSize) / gridSize : startTime,
            duration: snapEnabled ? 1 / gridSize : 0.25,
            velocity: 100,
            channel: 0,
        };
        setNotes([...notes, newNote]);
    };

    const handleMoveNote = (index: number, newStartTime: number, newPitch: number) => {
        const updatedNotes = [...notes];
        updatedNotes[index] = {
            ...updatedNotes[index],
            note: newPitch,
            note_name: getNoteName(newPitch),
            start_time: snapEnabled ? Math.round(newStartTime * gridSize) / gridSize : newStartTime,
        };
        setNotes(updatedNotes);
    };

    const handleResizeNote = (index: number, newDuration: number) => {
        const updatedNotes = [...notes];
        updatedNotes[index] = {
            ...updatedNotes[index],
            duration: Math.max(0.0625, snapEnabled ? Math.round(newDuration * gridSize) / gridSize : newDuration),
        };
        setNotes(updatedNotes);
    };

    const handleUpdateVelocity = (index: number, newVelocity: number) => {
        const updatedNotes = [...notes];
        updatedNotes[index] = {
            ...updatedNotes[index],
            velocity: Math.max(1, Math.min(127, Math.round(newVelocity))),
        };
        setNotes(updatedNotes);
    };

    const handleDeleteNote = (index: number) => {
        setNotes(notes.filter((_, i) => i !== index));
        setSelectedNotes(new Set(Array.from(selectedNotes).filter(i => i !== index)));
    };

    const handleDeleteSelected = () => {
        setNotes(notes.filter((_, i) => !selectedNotes.has(i)));
        setSelectedNotes(new Set());
    };

    const handleCopyNotes = () => {
        const notesToCopy = Array.from(selectedNotes).map(i => notes[i]);
        setCopiedNotes(notesToCopy);
    };

    const handlePasteNotes = () => {
        if (copiedNotes.length === 0) return;

        // Find the earliest start time in copied notes
        const minStartTime = Math.min(...copiedNotes.map(n => n.start_time));

        // Paste notes at the current playhead position (or start of clip)
        const pasteOffset = 0 - minStartTime; // Paste at beginning for now

        const pastedNotes = copiedNotes.map(note => ({
            ...note,
            start_time: note.start_time + pasteOffset,
        }));

        setNotes([...notes, ...pastedNotes]);
    };

    const handleSave = () => {
        onUpdateNotes(clipId, notes);
        onClose();
    };

    const handleCancel = () => {
        setNotes(midiEvents); // Reset to original
        onClose();
    };

    // Keyboard shortcuts for copy/paste
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNotes.size > 0) {
                e.preventDefault();
                handleCopyNotes();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedNotes.length > 0) {
                e.preventDefault();
                handlePasteNotes();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, selectedNotes, copiedNotes, notes]);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">MIDI Editor - {clipName}</span>
                    <span className="text-xs text-muted-foreground">
                        {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        • Bar {Math.floor(clipStartTime / 4) + 1} • {clipDuration} beats
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <IconButton
                        icon={Grid3x3}
                        tooltip={snapEnabled ? "Snap: ON" : "Snap: OFF"}
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        variant={snapEnabled ? "default" : "ghost"}
                        size="icon-sm"
                    />
                    <Button onClick={handleDeleteSelected} size="sm" variant="ghost" disabled={selectedNotes.size === 0}>
                        <Trash2 size={14} className="mr-1" />
                        Delete ({selectedNotes.size})
                    </Button>
                    <Button onClick={handleSave} size="sm" variant="default">
                        <Save size={14} className="mr-1" />
                        Save
                    </Button>
                    <IconButton
                        icon={X}
                        tooltip="Close Piano Roll"
                        onClick={onClose}
                        variant="ghost"
                        size="icon-sm"
                    />
                </div>
            </div>

            {/* Piano Roll Content - Match Timeline Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Match timeline's 256px track list width */}
                <div className="w-64 border-r border-border flex-shrink-0 bg-background">
                    {/* Piano Keyboard */}
                    <SequencerPanelPianoRollKeyboard
                        minPitch={minPitch}
                        maxPitch={maxPitch}
                        noteHeight={noteHeight}
                    />
                </div>

                {/* Right Grid - Scrollable, matches timeline width */}
                <div className="flex-1 overflow-auto">
                    <SequencerPanelPianoRollGrid
                        notes={notes}
                        selectedNotes={selectedNotes}
                        minPitch={minPitch}
                        maxPitch={maxPitch}
                        clipStartTime={clipStartTime}
                        clipDuration={clipDuration}
                        totalBeats={totalBeats}
                        beatWidth={beatWidth}
                        noteHeight={noteHeight}
                        snapEnabled={snapEnabled}
                        gridSize={gridSize}
                        onAddNote={handleAddNote}
                        onMoveNote={handleMoveNote}
                        onResizeNote={handleResizeNote}
                        onUpdateVelocity={handleUpdateVelocity}
                        onDeleteNote={handleDeleteNote}
                        onSelectNote={(index) => setSelectedNotes(new Set([index]))}
                        onToggleSelectNote={(index) => {
                            const newSelected = new Set(selectedNotes);
                            if (newSelected.has(index)) {
                                newSelected.delete(index);
                            } else {
                                newSelected.add(index);
                            }
                            setSelectedNotes(newSelected);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

