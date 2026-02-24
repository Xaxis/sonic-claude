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
    onClipDragStateChange?: (clipId: string, dragState: { startTime: number; duration: number } | null) => void; // For piano roll sync
}

export function SequencerTimeline({
    expandedTracks,
    scrollContainerRef,
    onClipDragStateChange,
}: SequencerTimelineProps) {
    // ========================================================================
    // STATE: Read directly from Zustand store
    // ========================================================================
    const tracks = useDAWStore(state => state.tracks);
    const clips = useDAWStore(state => state.clips);
    const transport = useDAWStore(state => state.transport);
    const currentPosition = transport?.position_beats ?? 0;

    // ========================================================================
    // ACTIONS: Get directly from Zustand store
    // ========================================================================
    const setSelectedClipId = useDAWStore(state => state.setSelectedClipId);
    const duplicateClip = useDAWStore(state => state.duplicateClip);
    const deleteClip = useDAWStore(state => state.deleteClip);
    const addClip = useDAWStore(state => state.addClip);
    const updateClip = useDAWStore(state => state.updateClip);
    const openPianoRoll = useDAWStore(state => state.openPianoRoll);
    const setLoopStart = useDAWStore(state => state.setLoopStart);
    const setLoopEnd = useDAWStore(state => state.setLoopEnd);
    const seek = useDAWStore(state => state.seek);
    const activeComposition = useDAWStore(state => state.activeComposition);

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

    // ========================================================================
    // HANDLER WRAPPERS: Adapt store actions to component callbacks
    // ========================================================================
    const handleAddClipToTrack = async (trackId: string, startTime: number) => {
        if (!activeComposition) return;
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        const clipRequest = {
            sequence_id: activeComposition.id,
            clip_type: track.type === "midi" ? "midi" : "audio",
            track_id: trackId,
            start_time: startTime,
            duration: 4.0, // Default 1 bar at 4/4
        };
        await addClip(clipRequest);
    };

    const handleDuplicateClip = async (clipId: string) => {
        if (!activeComposition) return;
        await duplicateClip(activeComposition.id, clipId);
    };

    const handleMoveClip = async (clipId: string, newStartTime: number) => {
        await updateClip(clipId, { start_time: newStartTime });
    };

    const handleResizeClip = async (clipId: string, newDuration: number) => {
        await updateClip(clipId, { duration: newDuration });
    };

    const handleUpdateClip = async (clipId: string, updates: { gain?: number; audio_offset?: number }) => {
        await updateClip(clipId, updates);
    };

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
                    <SequencerTimelineLoopRegion
                        pixelsPerBeat={pixelsPerBeat}
                        onLoopStartChange={setLoopStart}
                        onLoopEndChange={setLoopEnd}
                    />

                    {/* Track Rows */}
                    {tracks.map((track) => (
                        <SequencerTimelineTrackRow
                            key={track.id}
                            track={track}
                            clips={clips}
                            pixelsPerBeat={pixelsPerBeat}
                            isExpanded={expandedTracks?.has(track.id)}
                            onSelectClip={setSelectedClipId}
                            onDuplicateClip={handleDuplicateClip}
                            onDeleteClip={deleteClip}
                            onAddClipToTrack={handleAddClipToTrack}
                            onMoveClip={handleMoveClip}
                            onResizeClip={handleResizeClip}
                            onUpdateClip={handleUpdateClip}
                            onOpenPianoRoll={openPianoRoll}
                            onOpenSampleEditor={() => {}} // TODO: Implement sample editor
                            onClipDragStateChange={onClipDragStateChange}
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

