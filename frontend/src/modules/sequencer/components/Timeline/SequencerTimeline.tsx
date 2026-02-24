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

import { useEffect } from "react";
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
    const transport = useDAWStore(state => state.transport);
    const currentPosition = transport?.position_beats ?? 0;

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const seek = useDAWStore(state => state.seek);

    // ========================================================================
    // CALCULATIONS
    // ========================================================================
    const { pixelsPerBeat, rulerMarkers, zoom } = useTimelineCalculations();
    const playheadX = currentPosition * pixelsPerBeat * zoom;

    // ========================================================================
    // AUTO-SCROLL: Keep playhead visible during playback
    // ========================================================================
    useEffect(() => {
        if (!scrollContainerRef?.current) return;

        const container = scrollContainerRef.current;
        const containerWidth = container.clientWidth;
        const scrollLeft = container.scrollLeft;

        // Calculate playhead position relative to scroll
        const playheadRelativeX = playheadX - scrollLeft;

        // Auto-scroll if playhead is near the right edge (within 20% of container width)
        const scrollThreshold = containerWidth * 0.8;

        if (playheadRelativeX > scrollThreshold) {
            // Scroll to keep playhead at 50% of container width
            const targetScrollLeft = playheadX - containerWidth * 0.5;
            container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                behavior: 'smooth',
            });
        }
        // Also scroll if playhead is off-screen to the left
        else if (playheadRelativeX < 0) {
            container.scrollTo({
                left: Math.max(0, playheadX - containerWidth * 0.2),
                behavior: 'smooth',
            });
        }
    }, [playheadX, scrollContainerRef]);

    return (
        <>
            {/* Tracks and Clips - Ruler is now rendered in fixed header above */}
            {tracks.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    No tracks. Add a track to start sequencing.
                </div>
            ) : (
                <div className="relative">
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
                    />
                </div>
            )}
        </>
    );
}

