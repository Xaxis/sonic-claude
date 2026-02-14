/**
 * SequencerPanelTimeline - Timeline container component
 *
 * Composes timeline subcomponents into a cohesive timeline view:
 * - SequencerPanelTimelineRuler: Time ruler with measure markers
 * - SequencerPanelTimelineGrid: Grid lines background
 * - SequencerPanelTimelineLoopRegion: Loop region markers
 * - SequencerPanelTimelinePlayhead: Playhead indicator with drag support
 * - SequencerPanelTimelineTrackRow: Individual track rows with clips
 */

import { useRef, useEffect } from "react";
import { SequencerPanelTimelineRuler } from "./SequencerPanelTimelineRuler.tsx";
import { SequencerPanelTimelineGrid } from "./SequencerPanelTimelineGrid.tsx";
import { SequencerPanelTimelineLoopRegion } from "./SequencerPanelTimelineLoopRegion.tsx";
import { SequencerPanelTimelinePlayhead } from "./SequencerPanelTimelinePlayhead.tsx";
import { SequencerPanelTimelineTrackRow } from "./SequencerPanelTimelineTrackRow.tsx";

interface Clip {
    id: string;
    name: string;
    track_id: string;
    start_time: number;
    duration: number;
    type: "midi" | "audio";
    audio_file_path?: string;
    audio_offset?: number;
    gain: number;
}

interface Track {
    id: string;
    name: string;
    color?: string;
}

interface SequencerPanelTimelineProps {
    tracks: Track[];
    clips: Clip[];
    zoom: number;
    currentPosition: number;
    isPlaying?: boolean;
    tempo?: number;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    snapEnabled: boolean;
    gridSize: number;
    selectedClip: string | null;
    pianoRollClipId?: string | null; // ID of clip currently open in piano roll
    expandedTracks?: Set<string>; // Track header expansion state
    onSelectClip: (clipId: string) => void;
    onDuplicateClip: (clipId: string) => void;
    onDeleteClip: (clipId: string) => void;
    onAddClipToTrack?: (trackId: string, startBeat: number) => void;
    onMoveClip?: (clipId: string, newStartTime: number) => void;
    onResizeClip?: (clipId: string, newDuration: number) => void;
    onUpdateClip?: (clipId: string, updates: { gain?: number; audio_offset?: number }) => void;
    onOpenPianoRoll?: (clipId: string) => void;
    onLoopStartChange?: (newLoopStart: number) => void;
    onLoopEndChange?: (newLoopEnd: number) => void;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
    onClipDragStateChange?: (clipId: string, dragState: { startTime: number; duration: number } | null) => void;
}

export function SequencerPanelTimeline({
    tracks,
    clips,
    zoom,
    currentPosition,
    isPlaying = false,
    tempo = 120,
    isLooping,
    loopStart,
    loopEnd,
    snapEnabled,
    gridSize,
    selectedClip,
    pianoRollClipId,
    expandedTracks,
    onSelectClip,
    onDuplicateClip,
    onDeleteClip,
    onAddClipToTrack,
    onMoveClip,
    onResizeClip,
    onUpdateClip,
    onOpenPianoRoll,
    onLoopStartChange,
    onLoopEndChange,
    onSeek,
    onClipDragStateChange,
}: SequencerPanelTimelineProps) {
    const pixelsPerBeat = 40;
    const beatsPerMeasure = 4;

    // Calculate timeline width dynamically based on clips
    const minBeats = 64; // Minimum 16 measures
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 128); // Always add 128 beats (32 measures) padding after last clip
    const totalWidth = totalBeats * pixelsPerBeat * zoom;

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
                <SequencerPanelTimelineRuler
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
                        <SequencerPanelTimelineGrid rulerMarkers={rulerMarkers} />

                        {/* Loop Region */}
                        <SequencerPanelTimelineLoopRegion
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

                        {/* Track Rows */}
                        {tracks.map((track) => (
                            <SequencerPanelTimelineTrackRow
                                key={track.id}
                                track={track}
                                clips={clips}
                                selectedClip={selectedClip}
                                pianoRollClipId={pianoRollClipId}
                                zoom={zoom}
                                pixelsPerBeat={pixelsPerBeat}
                                snapEnabled={snapEnabled}
                                gridSize={gridSize}
                                isExpanded={expandedTracks?.has(track.id)}
                                onSelectClip={onSelectClip}
                                onDuplicateClip={onDuplicateClip}
                                onDeleteClip={onDeleteClip}
                                onAddClipToTrack={onAddClipToTrack}
                                onMoveClip={onMoveClip}
                                onResizeClip={onResizeClip}
                                onUpdateClip={onUpdateClip}
                                onOpenPianoRoll={onOpenPianoRoll}
                                onClipDragStateChange={onClipDragStateChange}
                            />
                        ))}

                        {/* Playhead - Rendered AFTER tracks so it appears on top */}
                        <SequencerPanelTimelinePlayhead
                            currentPosition={currentPosition}
                            pixelsPerBeat={pixelsPerBeat}
                            zoom={zoom}
                            snapEnabled={snapEnabled}
                            gridSize={gridSize}
                            isPlaying={isPlaying}
                            tempo={tempo}
                            loopEnabled={isLooping}
                            loopStart={loopStart}
                            loopEnd={loopEnd}
                            onSeek={onSeek}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

