/**
 * SequencerPianoRollSection Component
 *
 * Shared layout component for piano roll keyboard + grid.
 * Matches the architecture of SequencerTimelineSection.
 * Uses SequencerContext for state management.
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
import { useDAWStore } from '@/stores/dawStore';
import { SequencerGridLayout } from "./SequencerGridLayout.tsx";
import type { MIDIEvent } from "../types";
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
    instrument?: string; // Instrument/synthdef for note preview
    clipId: string; // Clip ID for matching active notes
    activeNotes?: ActiveNote[]; // Currently playing notes for visual feedback

    // Playback state (for ruler) - from WebSocket/AudioEngine, not from Context
    currentPosition: number;
    isPlaying: boolean;
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
        instrument,
        clipId,
        activeNotes,
        currentPosition,
        isPlaying,
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

    // Get state from Zustand store
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const zoom = useDAWStore(state => state.zoom);

    // Calculate total width for ruler
    // Add extra width to ensure content extends beyond viewport for smooth scrolling
    const totalWidth = totalBeats * beatWidth + 1000;

    return (
        <SequencerGridLayout
            cornerHeader={
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Notes
                </span>
            }
            ruler={
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
            }
            sidebar={
                <SequencerPianoRollKeyboard
                    minPitch={minPitch}
                    maxPitch={maxPitch}
                    noteHeight={noteHeight}
                    instrument={instrument}
                />
            }
            mainContent={
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
                        pixelsPerBeat={pixelsPerBeat}
                        onLoopStartChange={onLoopStartChange}
                        onLoopEndChange={onLoopEndChange}
                    />
                </div>
            }
            sidebarWidth={256}
            headerHeight={32}
            contentWidth={totalWidth}
            scrollRef={pianoRollScrollRef}
            onScroll={onPianoRollScroll}
            rulerScrollDataAttr="data-piano-ruler-scroll"
            sidebarScrollDataAttr="data-piano-keyboard"
        />
    );
}

