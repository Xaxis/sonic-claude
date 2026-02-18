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
import { SequencerTimelineRuler } from "./SequencerTimelineRuler.tsx";
import { SequencerTimelineGrid } from "./SequencerTimelineGrid.tsx";
import { SequencerTimelineLoopRegion } from "./SequencerTimelineLoopRegion.tsx";
import { SequencerTimelinePlayhead } from "./SequencerTimelinePlayhead.tsx";
import { SequencerTimelineTrackRow } from "./SequencerTimelineTrackRow.tsx";
import { useSequencerContext } from "../../contexts/SequencerContext.tsx";

interface SequencerTimelineProps {
    expandedTracks?: Set<string>; // Track header expansion state
    onSelectClip: (clipId: string) => void;
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
    // Get state from context
    const { state, tracks, clips, currentPosition } = useSequencerContext();
    const { zoom, snapEnabled, gridSize } = state;
    const pixelsPerBeat = 40;
    const beatsPerMeasure = 4;

    // Calculate timeline width dynamically based on clips
    const minBeats = 64; // Minimum 16 measures
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 128); // Always add 128 beats (32 measures) padding after last clip
    // Add extra width to ensure content extends beyond viewport for smooth scrolling
    const totalWidth = totalBeats * pixelsPerBeat * zoom + 1000;

    // Ref for timeline container to enable auto-scroll
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    // Generate ruler markers - always show beats, not grid subdivisions
    // Grid subdivisions are too cluttered in the ruler/grid
    // The gridSize only affects snapping behavior, not visual grid
    const rulerMarkers = [];

    for (let beat = 0; beat <= totalBeats; beat++) {
        const x = beat * pixelsPerBeat * zoom;
        const isMeasure = beat % beatsPerMeasure === 0;
        const isBeat = true; // All markers are beat markers
        const measure = Math.floor(beat / beatsPerMeasure) + 1;

        rulerMarkers.push({
            beat,
            x,
            isMeasure,
            isBeat,
            label: isMeasure ? `${measure}` : "",
        });
    }

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
        <div ref={timelineContainerRef} className="flex flex-col flex-shrink-0" style={{ width: `${totalWidth}px`, minWidth: `${totalWidth}px` }}>
            {/* Ruler - Sticky header */}
            <div className="flex-shrink-0">
                <SequencerTimelineRuler
                    rulerMarkers={rulerMarkers}
                    totalWidth={totalWidth}
                    onSeek={onSeek}
                    pixelsPerBeat={pixelsPerBeat}
                    zoom={zoom}
                    snapEnabled={snapEnabled}
                    gridSize={gridSize}
                />
            </div>

            {/* Tracks and Clips - Grows vertically */}
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

