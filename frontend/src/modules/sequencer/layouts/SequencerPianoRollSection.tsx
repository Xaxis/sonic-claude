/**
 * SequencerPianoRollSection Component
 * 
 * Shared layout component for piano roll keyboard + grid.
 * Matches the architecture of SequencerTimelineSection.
 * 
 * Architecture:
 * - Piano keyboard (left): Fixed width, absolutely positioned, no scrollbar
 * - Piano grid (right): Flexible width, single scrollbar controls both
 * - Keyboard vertical scroll is synced with grid vertical scroll
 */

import React from "react";
import { SequencerPanelPianoRollKeyboard } from "../components/PianoRoll/SequencerPanelPianoRollKeyboard.tsx";
import { SequencerPanelPianoRollGrid } from "../components/PianoRoll/SequencerPanelPianoRollGrid.tsx";
import type { MIDIEvent } from "../types.ts";
import type { ActiveNote } from "@/hooks/useTransportWebsocket.ts";

interface SequencerPianoRollSectionProps {
    // Data
    notes: MIDIEvent[];
    selectedNotes: Set<number>;
    
    // Piano roll settings
    minPitch: number;
    maxPitch: number;
    noteHeight: number;
    clipStartTime: number;
    clipDuration: number;
    totalBeats: number;
    beatWidth: number;
    snapEnabled: boolean;
    gridSize: number;
    instrument?: string; // Instrument/synthdef for note preview
    clipId: string; // Clip ID for matching active notes
    activeNotes?: ActiveNote[]; // Currently playing notes for visual feedback

    // Scroll
    pianoRollScrollRef: React.RefObject<HTMLDivElement | null>;
    onPianoRollScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    
    // Note handlers
    onAddNote: (pitch: number, startTime: number) => void;
    onMoveNote: (index: number, newStartTime: number, newPitch: number) => void;
    onResizeNote: (index: number, newDuration: number) => void;
    onUpdateVelocity: (index: number, newVelocity: number) => void;
    onDeleteNote: (index: number) => void;
    onSelectNote: (index: number) => void;
    onToggleSelectNote: (index: number) => void;
}

export function SequencerPianoRollSection(props: SequencerPianoRollSectionProps) {
    const {
        notes,
        selectedNotes,
        minPitch,
        maxPitch,
        noteHeight,
        clipStartTime,
        clipDuration,
        totalBeats,
        beatWidth,
        snapEnabled,
        gridSize,
        instrument,
        clipId,
        activeNotes,
        pianoRollScrollRef,
        onPianoRollScroll,
        onAddNote,
        onMoveNote,
        onResizeNote,
        onUpdateVelocity,
        onDeleteNote,
        onSelectNote,
        onToggleSelectNote,
    } = props;
    
    // Local scroll handler - syncs keyboard vertical + calls parent handler for timeline horizontal
    const handleLocalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // Sync piano keyboard vertical scroll
        const keyboardEl = e.currentTarget.parentElement?.querySelector('[data-piano-keyboard]') as HTMLDivElement;
        if (keyboardEl) {
            keyboardEl.scrollTop = e.currentTarget.scrollTop;
        }
        
        // Call parent handler for timeline horizontal sync
        onPianoRollScroll(e);
    };

    return (
        <div className="flex flex-1 min-h-0 relative">
            {/* Piano Keyboard (Left) - Fixed width, NO scrollbar */}
            <div className="w-64 border-r border-border flex flex-col flex-shrink-0 bg-background absolute left-0 top-0 bottom-0 z-10">
                {/* Piano Keyboard - Controlled scroll (no scrollbar) */}
                <div
                    data-piano-keyboard
                    className="flex-1 overflow-hidden"
                >
                    <SequencerPanelPianoRollKeyboard
                        minPitch={minPitch}
                        maxPitch={maxPitch}
                        noteHeight={noteHeight}
                        instrument={instrument}
                    />
                </div>
            </div>

            {/* Piano Grid (Right) - ONLY scrollbar, controls everything */}
            <div
                ref={pianoRollScrollRef}
                className="flex-1 min-w-0 min-h-0 overflow-auto pl-64"
                onScroll={handleLocalScroll}
            >
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
                    clipId={clipId}
                    activeNotes={activeNotes}
                    onAddNote={onAddNote}
                    onMoveNote={onMoveNote}
                    onResizeNote={onResizeNote}
                    onUpdateVelocity={onUpdateVelocity}
                    onDeleteNote={onDeleteNote}
                    onSelectNote={onSelectNote}
                    onToggleSelectNote={onToggleSelectNote}
                />
            </div>
        </div>
    );
}

