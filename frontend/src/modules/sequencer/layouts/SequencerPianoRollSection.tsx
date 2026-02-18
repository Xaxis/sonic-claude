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
import { SequencerPianoRollKeyboard } from "../components/PianoRoll/SequencerPianoRollKeyboard.tsx";
import { SequencerPianoRollGrid } from "../components/PianoRoll/SequencerPianoRollGrid.tsx";
import { SequencerPianoRollRuler } from "../components/PianoRoll/SequencerPianoRollRuler.tsx";
import { SequencerTimelineLoopRegion } from "../components/Timeline/SequencerTimelineLoopRegion.tsx";
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

    // Playback state (for ruler)
    currentPosition: number;
    isPlaying: boolean;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    zoom: number;
    pixelsPerBeat: number;

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
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onLoopStartChange: (start: number) => void;
    onLoopEndChange: (end: number) => void;
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
        currentPosition,
        isPlaying,
        isLooping,
        loopStart,
        loopEnd,
        zoom,
        pixelsPerBeat,
        pianoRollScrollRef,
        onPianoRollScroll,
        onAddNote,
        onMoveNote,
        onResizeNote,
        onUpdateVelocity,
        onDeleteNote,
        onSelectNote,
        onToggleSelectNote,
        onSeek,
        onLoopStartChange,
        onLoopEndChange,
    } = props;

    // Calculate total width for ruler
    // Add extra width to ensure content extends beyond viewport for smooth scrolling
    const totalWidth = totalBeats * beatWidth + 1000;

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
                    <SequencerPianoRollKeyboard
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
                className="flex-1 min-w-0 min-h-0 overflow-auto"
                onScroll={handleLocalScroll}
                style={{ paddingLeft: '256px' }}
            >
                <div className="flex flex-col">
                    {/* Ruler - Sticky at top, z-index lower than left panel so it scrolls underneath */}
                    <div className="sticky top-0 z-[5] bg-background">
                        <SequencerPianoRollRuler
                            totalBeats={totalBeats}
                            currentPosition={currentPosition}
                            isPlaying={isPlaying}
                            zoom={zoom}
                            pixelsPerBeat={pixelsPerBeat}
                            totalWidth={totalWidth}
                            snapEnabled={snapEnabled}
                            gridSize={gridSize}
                            onSeek={onSeek}
                        />
                    </div>

                    {/* Piano Roll Grid - Wrapped in relative container for loop region */}
                    <div className="relative">
                        <SequencerPianoRollGrid
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

                        {/* Loop Region - Overlaid on grid */}
                        <SequencerTimelineLoopRegion
                            isLooping={isLooping}
                            loopStart={loopStart}
                            loopEnd={loopEnd}
                            pixelsPerBeat={pixelsPerBeat}
                            zoom={zoom}
                            snapEnabled={snapEnabled}
                            gridSize={gridSize}
                            onLoopStartChange={onLoopStartChange}
                            onLoopEndChange={onLoopEndChange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

