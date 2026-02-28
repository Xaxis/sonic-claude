/**
 * SequencerTimeline - Timeline container component
 *
 * REFACTORED: Uses Zustand best practices
 * - Reads state directly from store (no prop drilling)
 * - Calls actions directly from store (no handler props)
 * - Uses Zustand scroll state for auto-scroll
 *
 * Composes timeline subcomponents into a cohesive timeline view:
 * - SequencerTimelineGrid: Grid lines background
 * - SequencerTimelineLoopRegion: Loop region markers
 * - SequencerTimelinePlayhead: Playhead indicator with drag support
 * - SequencerTimelineTrackRow: Individual track rows with clips
 */

import React from "react";
import { SequencerTimelineGrid } from "./SequencerTimelineGrid.tsx";
import { SequencerTimelineLoopRegion } from "./SequencerTimelineLoopRegion.tsx";
import { SequencerTimelinePlayhead } from "./SequencerTimelinePlayhead.tsx";
import { SequencerTimelineTrackRow } from "./SequencerTimelineTrackRow.tsx";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";

interface SequencerTimelineProps {
    expandedTracks?: Set<string>; // Track header expansion state (local UI state, not in Zustand)
    scrollContainerRef?: React.RefObject<HTMLDivElement | null>; // Ref to scroll container for auto-scroll
}

export function SequencerTimeline({
    expandedTracks,
    scrollContainerRef,
}: SequencerTimelineProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const seek = useDAWStore(state => state.seek);

    // ========================================================================
    // CALCULATIONS
    // ========================================================================
    const { pixelsPerBeat, rulerMarkers, totalWidth } = useTimelineCalculations();

    // Auto-scroll is handled inside SequencerTimelinePlayhead's RAF loop
    // so it runs at 60fps in sync with the interpolated playhead position.

    return (
        <>
            {/* Tracks and Clips - Ruler is now rendered in fixed header above */}
            {tracks.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    No tracks. Add a track to start sequencing.
                </div>
            ) : (
                <div className="relative" style={{ width: `${totalWidth}px` }}>
                    {/* Grid Lines */}
                    <SequencerTimelineGrid rulerMarkers={rulerMarkers} />

                    {/* Loop Region */}
                    <SequencerTimelineLoopRegion />

                    {/* Track Rows */}
                    {tracks.map((track) => (
                        <SequencerTimelineTrackRow
                            key={track.id}
                            track={track}
                            isExpanded={expandedTracks?.has(track.id)}
                        />
                    ))}

                    {/* Playhead - Rendered AFTER tracks so it appears on top */}
                    <SequencerTimelinePlayhead
                        pixelsPerBeat={pixelsPerBeat}
                        onSeek={seek}
                        scrollContainerRef={scrollContainerRef}
                    />
                </div>
            )}
        </>
    );
}

