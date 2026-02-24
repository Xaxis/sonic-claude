/**
 * SequencerPianoRoll - Piano roll MIDI editor (bottom panel)
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads state directly from store (transport, activeNotes, etc.)
 * - Calls actions directly from store (updateClip, seek, setLoopStart, etc.)
 * - Only receives clip data props (no callback props)
 *
 * Shows when a MIDI clip is selected. Allows visual editing of MIDI notes.
 * Displays as a bottom panel in the sequencer (like Ableton's clip view).
 */

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { SequencerPianoRollSection } from "@/modules/sequencer/components/PianoRoll/SequencerPianoRollSection.tsx";
import { useDAWStore } from '@/stores/dawStore';
import type { MIDIEvent } from "../../types.ts";

interface SequencerPianoRollProps {
    // Clip data (read-only props)
    clipId: string;
    clipName: string;
    clipDuration: number; // beats
    clipStartTime: number; // beats - position in sequence
    midiEvents: MIDIEvent[];
    totalBeats: number; // Total composition length in beats
    instrument?: string; // Instrument/synthdef for note preview

    // Scroll ref (for scroll sync)
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function SequencerPianoRoll({
    clipId,
    clipName,
    midiEvents,
    pianoRollScrollRef,
}: SequencerPianoRollProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const clips = useDAWStore(state => state.clips);

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const closePianoRoll = useDAWStore(state => state.closePianoRoll);
    const updateClip = useDAWStore(state => state.updateClip);

    // ========================================================================
    // DERIVED STATE: Get clip data for header display
    // ========================================================================
    const clip = clips.find(c => c.id === clipId);
    const clipStartTime = clip?.start_time || 0;
    const clipDuration = clip?.duration || 0;

    // ========================================================================
    // LOCAL UI STATE (not persisted to store)
    // ========================================================================
    const [selectedNotes, setSelectedNotes] = useState<Set<number>>(new Set());
    const [copiedNotes, setCopiedNotes] = useState<MIDIEvent[]>([]);

    // ========================================================================
    // HANDLERS: Local UI state management only
    // ========================================================================
    const handleDeleteSelected = async () => {
        await updateClip(clipId, { midi_events: midiEvents.filter((_, i) => !selectedNotes.has(i)) });
        setSelectedNotes(new Set());
    };

    const handleCopyNotes = () => {
        const notesToCopy = Array.from(selectedNotes).map(i => midiEvents[i]);
        setCopiedNotes(notesToCopy);
    };

    const handlePasteNotes = async () => {
        if (copiedNotes.length === 0) return;

        // Find the earliest start time in copied notes
        const minStartTime = Math.min(...copiedNotes.map(n => n.start_time));

        // Paste notes at the current playhead position (or start of clip)
        const pasteOffset = 0 - minStartTime; // Paste at beginning for now

        const pastedNotes = copiedNotes.map(note => ({
            ...note,
            start_time: note.start_time + pasteOffset,
        }));

        await updateClip(clipId, { midi_events: [...midiEvents, ...pastedNotes] });
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
                            onClick={closePianoRoll}
                            variant="ghost"
                            size="icon-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Piano Roll Content */}
            <SequencerPianoRollSection
                pianoRollScrollRef={pianoRollScrollRef}
                selectedNotes={selectedNotes}
                onSelectNote={(index: number) => setSelectedNotes(new Set([index]))}
                onToggleSelectNote={(index: number) => {
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

