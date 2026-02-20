/**
 * SequencerPianoRoll - Piano roll MIDI editor (bottom panel)
 *
 * Shows when a MIDI clip is selected. Allows visual editing of MIDI notes.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view).
 */

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { SequencerPianoRollSection } from "../../layouts/SequencerPianoRollSection.tsx";
import { useSequencerContext } from '@/contexts/SequencerContext';
import type { MIDIEvent } from "../../types.ts";
import type { ActiveNote } from "@/hooks/useTransportWebsocket.ts";
import { api } from "@/services/api";

interface SequencerPianoRollProps {
    clipId: string;
    clipName: string;
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    midiEvents: MIDIEvent[];
    totalBeats: number; // Total composition length in beats
    instrument?: string; // Instrument/synthdef for note preview
    activeNotes?: ActiveNote[]; // Currently playing notes for visual feedback
    currentPosition: number; // Playback position
    isPlaying: boolean; // Playback state
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    onPianoRollScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onUpdateNotes: (clipId: string, notes: MIDIEvent[]) => Promise<void>;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function SequencerPianoRoll({
    clipId,
    clipName,
    clipDuration,
    clipStartTime,
    midiEvents,
    totalBeats,
    instrument,
    activeNotes,
    currentPosition,
    isPlaying,
    pianoRollScrollRef,
    onPianoRollScroll,
    onClose,
    onUpdateNotes,
    onSeek,
    onLoopStartChange,
    onLoopEndChange,
}: SequencerPianoRollProps) {
    // Get state from context
    const { state, actions } = useSequencerContext();
    const { snapEnabled, gridSize, zoom, isLooping, loopStart, loopEnd } = state;

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
            await api.sequencer.previewNote({
                note: pitch,
                velocity: 100,
                duration: 0.5,
                synthdef: instrument || "sine"
            });
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
                await api.sequencer.previewNote({
                    note: newPitch,
                    velocity: updatedNotes[index].velocity,
                    duration: 0.5,
                    synthdef: instrument || "sine"
                });
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
                instrument={instrument}
                clipId={clipId}
                activeNotes={activeNotes}
                currentPosition={currentPosition}
                isPlaying={isPlaying}
                pixelsPerBeat={pixelsPerBeat}
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
                onSeek={onSeek}
                onLoopStartChange={onLoopStartChange}
                onLoopEndChange={onLoopEndChange}
            />
        </div>
    );
}

