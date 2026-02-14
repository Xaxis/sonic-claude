/**
 * SequencerPanelPianoRoll - Piano roll MIDI editor (bottom panel)
 *
 * Shows when a MIDI clip is selected. Allows visual editing of MIDI notes.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view).
 */

import { useState, useEffect } from "react";
import { X, Trash2, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { SequencerPianoRollSection } from "../../layouts/SequencerPianoRollSection.tsx";
import type { MIDIEvent } from "../../types.ts";
import { api } from "@/services/api";

interface SequencerPanelPianoRollProps {
    clipId: string;
    clipName: string;
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    midiEvents: MIDIEvent[];
    snapEnabled: boolean; // Controlled from parent
    gridSize: number; // Controlled from parent
    zoom: number; // SHARED with timeline (Ableton pattern)
    totalBeats: number; // Total composition length in beats
    instrument?: string; // Instrument/synthdef for note preview
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    onPianoRollScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onUpdateNotes: (clipId: string, notes: MIDIEvent[]) => Promise<void>;
    onToggleSnap: () => void;
    onSetGridSize: (size: number) => void;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function SequencerPanelPianoRoll({
    clipId,
    clipName,
    clipDuration,
    clipStartTime,
    midiEvents,
    snapEnabled,
    gridSize,
    zoom,
    totalBeats,
    instrument,
    pianoRollScrollRef,
    onPianoRollScroll,
    onClose,
    onUpdateNotes,
    onToggleSnap,
    onSetGridSize,
}: SequencerPanelPianoRollProps) {
    // Local UI state only (not persisted)
    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [copiedNotes, setCopiedNotes] = useState<MIDIEvent[]>([]);

    // Piano roll settings
    const minPitch = 21; // A0 - Full piano range
    const maxPitch = 108; // C8
    const pixelsPerBeat = 40; // Base pixels per beat
    const beatWidth = pixelsPerBeat * zoom; // Apply piano roll zoom
    const noteHeight = 20; // pixels per note row (taller for better clicking)

    const getNoteName = (pitch: number): string => {
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = NOTE_NAMES[pitch % 12];
        return `${noteName}${octave}`;
    };

    const handleAddNote = async (pitch: number, startTime: number) => {
        const newNote: MIDIEvent = {
            note: pitch,
            note_name: getNoteName(pitch),
            start_time: snapEnabled ? Math.round(startTime * gridSize) / gridSize : startTime,
            duration: snapEnabled ? 1 / gridSize : 0.25,
            velocity: 100,
            channel: 0,
        };
        onUpdateNotes(clipId, [...midiEvents, newNote]);

        // Preview the note
        try {
            await api.audioEngine.previewNote(pitch, 100, 0.5, instrument || "sine");
        } catch (error) {
            console.error("Failed to preview note:", error);
        }
    };

    const handleMoveNote = async (index: number, newStartTime: number, newPitch: number) => {
        const updatedNotes = [...midiEvents];
        const oldPitch = updatedNotes[index].note;
        updatedNotes[index] = {
            ...updatedNotes[index],
            note: newPitch,
            note_name: getNoteName(newPitch),
            start_time: snapEnabled ? Math.round(newStartTime * gridSize) / gridSize : newStartTime,
        };
        onUpdateNotes(clipId, updatedNotes);

        // Preview the note only if pitch changed
        if (newPitch !== oldPitch) {
            try {
                await api.audioEngine.previewNote(newPitch, updatedNotes[index].velocity, 0.5, instrument || "sine");
            } catch (error) {
                console.error("Failed to preview note:", error);
            }
        }
    };

    const handleResizeNote = (index: number, newDuration: number) => {
        const updatedNotes = [...midiEvents];
        updatedNotes[index] = {
            ...updatedNotes[index],
            duration: Math.max(0.0625, snapEnabled ? Math.round(newDuration * gridSize) / gridSize : newDuration),
        };
        onUpdateNotes(clipId, updatedNotes);
    };

    const handleUpdateVelocity = (index: number, newVelocity: number) => {
        const updatedNotes = [...midiEvents];
        updatedNotes[index] = {
            ...updatedNotes[index],
            velocity: Math.max(1, Math.min(127, Math.round(newVelocity))),
        };
        onUpdateNotes(clipId, updatedNotes);
    };

    const handleDeleteNote = (index: number) => {
        onUpdateNotes(clipId, midiEvents.filter((_, i) => i !== index));
        setSelectedNotes(new Set(Array.from(selectedNotes).filter(i => i !== index)));
    };

    const handleDeleteSelected = () => {
        onUpdateNotes(clipId, midiEvents.filter((_, i) => !selectedNotes.has(i)));
        setSelectedNotes(new Set());
    };

    const handleCopyNotes = () => {
        const notesToCopy = Array.from(selectedNotes).map(i => midiEvents[i]);
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

        onUpdateNotes(clipId, [...midiEvents, ...pastedNotes]);
    };

    // Keyboard shortcuts for copy/paste/delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNotes.size > 0) {
                e.preventDefault();
                handleCopyNotes();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedNotes.length > 0) {
                e.preventDefault();
                handlePasteNotes();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNotes.size > 0) {
                e.preventDefault();
                handleDeleteSelected();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedNotes, copiedNotes, midiEvents]);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header - Matches timeline header structure */}
            <div className="border-b border-border bg-muted/20 flex items-center flex-shrink-0 relative">
                {/* Left Column - Fixed (matches piano keyboard width) */}
                <div className="w-64 px-3 py-2 border-r border-border flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Piano Roll
                    </span>
                </div>

                {/* Right Column - Scrollable content area (matches grid) */}
                <div className="flex-1 px-4 py-2 pl-[17rem] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{clipName}</span>
                        <span className="text-xs text-muted-foreground">
                            {midiEvents.length} {midiEvents.length === 1 ? 'note' : 'notes'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            • Bar {Math.floor(clipStartTime / 4) + 1} • {clipDuration} beats
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Grid controls */}
                        <IconButton
                            icon={Grid3x3}
                            tooltip={snapEnabled ? "Snap: ON" : "Snap: OFF"}
                            onClick={onToggleSnap}
                            variant={snapEnabled ? "default" : "ghost"}
                            size="icon-sm"
                        />
                        <div className="flex items-center gap-1">
                            <Label htmlFor="piano-roll-grid-size" className="text-xs text-muted-foreground">
                                Grid
                            </Label>
                            <Select
                                value={gridSize.toString()}
                                onValueChange={(value) => onSetGridSize(parseInt(value))}
                                disabled={!snapEnabled}
                            >
                                <SelectTrigger id="piano-roll-grid-size" className="w-20 h-7 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1/1</SelectItem>
                                    <SelectItem value="2">1/2</SelectItem>
                                    <SelectItem value="4">1/4</SelectItem>
                                    <SelectItem value="8">1/8</SelectItem>
                                    <SelectItem value="16">1/16</SelectItem>
                                    <SelectItem value="32">1/32</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Delete selected */}
                        <Button onClick={handleDeleteSelected} size="sm" variant="ghost" disabled={selectedNotes.size === 0}>
                            <Trash2 size={14} className="mr-1" />
                            Delete ({selectedNotes.size})
                        </Button>

                        {/* Close */}
                        <IconButton
                            icon={X}
                            tooltip="Close Piano Roll"
                            onClick={onClose}
                            variant="ghost"
                            size="icon-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Piano Roll Content - Use dedicated layout component */}
            <SequencerPianoRollSection
                notes={midiEvents}
                selectedNotes={selectedNotes}
                minPitch={minPitch}
                maxPitch={maxPitch}
                noteHeight={noteHeight}
                clipStartTime={clipStartTime}
                clipDuration={clipDuration}
                totalBeats={totalBeats}
                beatWidth={beatWidth}
                snapEnabled={snapEnabled}
                gridSize={gridSize}
                instrument={instrument}
                pianoRollScrollRef={pianoRollScrollRef}
                onPianoRollScroll={onPianoRollScroll}
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
    );
}

