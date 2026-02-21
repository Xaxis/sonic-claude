/**
 * SequencerTimeline - Timeline container component
 *
 * Composes timeline subcomponents into a cohesive timeline view:
 * - SequencerTimelineRuler: Time ruler with measure markers
 * - SequencerTimelineGrid: Grid lines background
 * - SequencerTimelineLoopRegion: Loop region markers
 * - SequencerTimelinePlayhead: Playhead indicator with drag support
 * - SequencerTimelineTrackRow: Individual track rows with clips
 * Uses SequencerContext for state management.
 */

import { useRef, useEffect } from "react";
import { SequencerTimelineGrid } from "./SequencerTimelineGrid.tsx";
import { SequencerTimelineLoopRegion } from "./SequencerTimelineLoopRegion.tsx";
import { SequencerTimelinePlayhead } from "./SequencerTimelinePlayhead.tsx";
import { SequencerTimelineTrackRow } from "./SequencerTimelineTrackRow.tsx";
import { useSequencer } from '@/contexts/SequencerContext';
import { useTimelineCalculations } from "../../hooks/useTimelineCalculations.ts";

interface SequencerTimelineProps {
    expandedTracks?: Set<string>; // Track header expansion state
    onSelectClip: (clipId: string | null) => void;
    onDuplicateClip: (clipId: string) => void;
    onDeleteClip: (clipId: string) => void;
    onAddClipToTrack?: (trackId: string, startBeat: number) => void;
    onMoveClip?: (clipId: string, newStartTime: number) => void;
    onResizeClip?: (clipId: string, newDuration: number) => void;
    onUpdateClip?: (clipId: string, updates: { gain?: number; audio_offset?: number }) => void;
    onOpenPianoRoll?: (clipId: string) => void;
    onOpenSampleEditor?: (clipId: string) => void;
    onLoopStartChange?: (newLoopStart: number) => void;
    onLoopEndChange?: (newLoopEnd: number) => void;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onClipDragStateChange?: (clipId: string, dragState: { startTime: number; duration: number } | null) => void;
}

export function SequencerTimeline({
    expandedTracks,
    onSelectClip,
    onDuplicateClip,
    onDeleteClip,
    onAddClipToTrack,
    onMoveClip,
    onResizeClip,
    onUpdateClip,
    onOpenPianoRoll,
    onOpenSampleEditor,
    onLoopStartChange,
    onLoopEndChange,
    onSeek,
    onClipDragStateChange,
}: SequencerTimelineProps) {
    // Get state from global context
    const { tracks, clips, currentPosition, snapEnabled, gridSize } = useSequencer();

    // Get timeline calculations from shared hook
    const { pixelsPerBeat, totalWidth, rulerMarkers, zoom } = useTimelineCalculations();

    // Ref for timeline container to enable auto-scroll
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    const playheadX = currentPosition * pixelsPerBeat * zoom;

    // Auto-scroll timeline to keep playhead visible during playback
    useEffect(() => {
        if (!timelineContainerRef.current) return;

        const container = timelineContainerRef.current;
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
    }, [playheadX]);

    return (
        <div ref={timelineContainerRef} className="flex-shrink-0" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
            {/* Tracks and Clips - Ruler is now rendered in fixed header above */}
            {tracks.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                    No tracks. Add a track to start sequencing.
                </div>
            ) : (
                <div className="flex-shrink-0" style={{ width: `${totalWidth}px` }}>
                    <div className="relative" style={{ width: `${totalWidth}px` }}>
                        {/* Grid Lines */}
                        <SequencerTimelineGrid rulerMarkers={rulerMarkers} />

                        {/* Loop Region */}
                        <SequencerTimelineLoopRegion
                            pixelsPerBeat={pixelsPerBeat}
                            onLoopStartChange={onLoopStartChange}
                            onLoopEndChange={onLoopEndChange}
                        />

                        {/* Track Rows */}
                        {tracks.map((track) => (
                            <SequencerTimelineTrackRow
                                key={track.id}
                                track={track}
                                clips={clips}
                                pixelsPerBeat={pixelsPerBeat}
                                isExpanded={expandedTracks?.has(track.id)}
                                onSelectClip={onSelectClip}
                                onDuplicateClip={onDuplicateClip}
                                onDeleteClip={onDeleteClip}
                                onAddClipToTrack={onAddClipToTrack}
                                onMoveClip={onMoveClip}
                                onResizeClip={onResizeClip}
                                onUpdateClip={onUpdateClip}
                                onOpenPianoRoll={onOpenPianoRoll}
                                onOpenSampleEditor={onOpenSampleEditor}
                                onClipDragStateChange={onClipDragStateChange}
                            />
                        ))}

                        {/* Playhead - Rendered AFTER tracks so it appears on top */}
                        <SequencerTimelinePlayhead
                            pixelsPerBeat={pixelsPerBeat}
                            onSeek={onSeek}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

