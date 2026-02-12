/**
 * SequencerPanelTimeline - Timeline ruler and grid with clips
 *
 * Displays time ruler, grid lines, and clips for all tracks
 */

import { useRef, useEffect, useState } from "react";
import { SequencerPanelClip } from "./SequencerPanelClip";

interface Clip {
    id: string;
    name: string;
    track_id: string;
    start_time: number;
    duration: number;
    type: "midi" | "audio";
    audio_file_path?: string;
}

interface Track {
    id: string;
    name: string;
    color?: string; // Track color
}

interface SequencerPanelTimelineProps {
    tracks: Track[];
    clips: Clip[];
    zoom: number;
    currentPosition: number;
    isLooping: boolean;
    loopStart: number;
    loopEnd: number;
    snapEnabled: boolean;
    gridSize: number; // Grid size: 4 = 1/4 note, 8 = 1/8 note, etc.
    selectedClip: string | null;
    onSelectClip: (clipId: string) => void;
    onDuplicateClip: (clipId: string) => void;
    onDeleteClip: (clipId: string) => void;
    onAddClipToTrack?: (trackId: string, startBeat: number) => void; // Click to add clip
    onMoveClip?: (clipId: string, newStartTime: number) => void; // Drag to move clip
    onResizeClip?: (clipId: string, newDuration: number) => void; // Resize clip
    onLoopStartChange?: (newLoopStart: number) => void; // Drag loop start marker
    onLoopEndChange?: (newLoopEnd: number) => void; // Drag loop end marker
}

export function SequencerPanelTimeline({
    tracks,
    clips,
    zoom,
    currentPosition,
    isLooping,
    loopStart,
    loopEnd,
    snapEnabled,
    gridSize,
    selectedClip,
    onSelectClip,
    onDuplicateClip,
    onDeleteClip,
    onAddClipToTrack,
    onMoveClip,
    onResizeClip,
    onLoopStartChange,
    onLoopEndChange,
}: SequencerPanelTimelineProps) {
    const pixelsPerBeat = 40; // Base pixels per beat
    const beatsPerMeasure = 4;

    // Calculate timeline width dynamically based on clips
    const minBeats = 64; // Minimum 16 measures
    const maxClipEnd = clips.length > 0
        ? Math.max(...clips.map(c => c.start_time + c.duration))
        : 0;
    const totalBeats = Math.max(minBeats, Math.ceil(maxClipEnd) + 16); // Add padding after last clip
    const totalWidth = totalBeats * pixelsPerBeat * zoom;

    // Generate ruler markers
    const rulerMarkers = [];
    for (let beat = 0; beat <= totalBeats; beat++) {
        const x = beat * pixelsPerBeat * zoom;
        const isMeasure = beat % beatsPerMeasure === 0;
        const measure = Math.floor(beat / beatsPerMeasure) + 1;

        rulerMarkers.push({
            beat,
            x,
            isMeasure,
            label: isMeasure ? `${measure}` : "",
        });
    }

    // Calculate playhead position
    const playheadX = currentPosition * pixelsPerBeat * zoom;

    // Calculate loop region positions
    const loopStartX = loopStart * pixelsPerBeat * zoom;
    const loopEndX = loopEnd * pixelsPerBeat * zoom;

    // Track mouse down position to detect drags vs clicks
    const mouseDownPosRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);

    // Ref for timeline container to enable auto-scroll
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    // State for dragging loop markers
    const [isDraggingLoopStart, setIsDraggingLoopStart] = useState(false);
    const [isDraggingLoopEnd, setIsDraggingLoopEnd] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

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

    // Handle mouse down on track
    const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only track mouse down if clicking on the track background (not on a clip)
        if (e.target === e.currentTarget) {
            mouseDownPosRef.current = { x: e.clientX, y: e.clientY, target: e.target };
        }
    };

    // Handle click on track to add clip (only if not dragging)
    const handleTrackClick = (trackId: string, e: React.MouseEvent<HTMLDivElement>) => {
        if (!onAddClipToTrack) return;

        // Only create clip if we clicked on the track background (not on a clip)
        if (e.target !== e.currentTarget) {
            mouseDownPosRef.current = null;
            return;
        }

        // Check if this was a drag (mouse moved more than 5px)
        if (mouseDownPosRef.current) {
            const deltaX = Math.abs(e.clientX - mouseDownPosRef.current.x);
            const deltaY = Math.abs(e.clientY - mouseDownPosRef.current.y);

            if (deltaX > 5 || deltaY > 5) {
                // This was a drag, not a click - don't create clip
                mouseDownPosRef.current = null;
                return;
            }
        }

        mouseDownPosRef.current = null;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickBeat = clickX / (pixelsPerBeat * zoom);

        // Snap to grid if snap is enabled (gridSize determines snap resolution)
        const finalBeat = snapEnabled ? Math.round(clickBeat * gridSize) / gridSize : clickBeat;

        onAddClipToTrack(trackId, finalBeat);
    };

    // Handle loop marker drag start
    const handleLoopMarkerMouseDown = (type: 'start' | 'end', e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (type === 'start') {
            setIsDraggingLoopStart(true);
            dragStartValueRef.current = loopStart;
        } else {
            setIsDraggingLoopEnd(true);
            dragStartValueRef.current = loopEnd;
        }

        dragStartXRef.current = e.clientX;
    };

    // Handle loop marker drag
    useEffect(() => {
        if (!isDraggingLoopStart && !isDraggingLoopEnd) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / (pixelsPerBeat * zoom);
            let newValue = dragStartValueRef.current + deltaBeat;

            // Clamp to valid range
            if (isDraggingLoopStart) {
                newValue = Math.max(0, Math.min(newValue, loopEnd - 1));
            } else {
                newValue = Math.max(loopStart + 1, newValue);
            }

            // Update position during drag (no snap yet)
            if (isDraggingLoopStart && onLoopStartChange) {
                onLoopStartChange(newValue);
            } else if (isDraggingLoopEnd && onLoopEndChange) {
                onLoopEndChange(newValue);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            // Apply snap on mouse up
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / (pixelsPerBeat * zoom);
            let newValue = dragStartValueRef.current + deltaBeat;

            // Snap to grid if enabled (gridSize determines snap resolution)
            if (snapEnabled) {
                newValue = Math.round(newValue * gridSize) / gridSize;
            }

            // Clamp to valid range
            if (isDraggingLoopStart) {
                newValue = Math.max(0, Math.min(newValue, loopEnd - 1));
                if (onLoopStartChange) {
                    onLoopStartChange(newValue);
                }
                setIsDraggingLoopStart(false);
            } else {
                newValue = Math.max(loopStart + 1, newValue);
                if (onLoopEndChange) {
                    onLoopEndChange(newValue);
                }
                setIsDraggingLoopEnd(false);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingLoopStart, isDraggingLoopEnd, loopStart, loopEnd, pixelsPerBeat, zoom, snapEnabled, gridSize, onLoopStartChange, onLoopEndChange]);

    return (
        <div ref={timelineContainerRef} className="flex flex-col h-full overflow-auto">
            {/* Ruler - Sticky header */}
            <div className="h-8 border-b border-border bg-muted/30 flex-shrink-0 sticky top-0 z-20">
                <div className="relative h-full" style={{ width: `${totalWidth}px` }}>
                    {rulerMarkers.map((marker) => (
                        <div
                            key={marker.beat}
                            className="absolute top-0 bottom-0 flex flex-col items-center"
                            style={{ left: `${marker.x}px` }}
                        >
                            {marker.isMeasure ? (
                                <>
                                    <div className="text-xs text-muted-foreground px-1">
                                        {marker.label}
                                    </div>
                                    <div className="flex-1 w-px bg-border" />
                                </>
                            ) : (
                                <div className="flex-1 w-px bg-border/30 mt-4" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tracks and Clips - Scrollable content */}
            <div className="flex-1 min-h-0">
                <div className="relative" style={{ width: `${totalWidth}px` }}>
                    {/* Grid Lines */}
                    <div className="absolute inset-0 pointer-events-none">
                        {rulerMarkers.map((marker) => (
                            <div
                                key={marker.beat}
                                className={
                                    marker.isMeasure
                                        ? "absolute top-0 bottom-0 w-px bg-border"
                                        : "absolute top-0 bottom-0 w-px bg-border/20"
                                }
                                style={{ left: `${marker.x}px` }}
                            />
                        ))}
                    </div>

                    {/* Loop Region - Show when looping is enabled */}
                    {isLooping && (
                        <>
                            {/* Loop region background */}
                            <div
                                className="absolute top-0 bottom-0 bg-primary/10 border-l-2 border-r-2 border-primary/40 z-10 pointer-events-none"
                                style={{
                                    left: `${loopStartX}px`,
                                    width: `${loopEndX - loopStartX}px`,
                                }}
                            />
                            {/* Loop start marker */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 cursor-ew-resize"
                                style={{ left: `${loopStartX}px` }}
                                onMouseDown={(e) => handleLoopMarkerMouseDown('start', e)}
                            >
                                <div
                                    className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-sm flex items-center justify-center hover:bg-primary/80 transition-colors cursor-ew-resize"
                                    title="Drag to adjust loop start"
                                >
                                    <span className="text-[8px] text-primary-foreground font-bold">L</span>
                                </div>
                            </div>
                            {/* Loop end marker */}
                            <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 cursor-ew-resize"
                                style={{ left: `${loopEndX}px` }}
                                onMouseDown={(e) => handleLoopMarkerMouseDown('end', e)}
                            >
                                <div
                                    className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-sm flex items-center justify-center hover:bg-primary/80 transition-colors cursor-ew-resize"
                                    title="Drag to adjust loop end"
                                >
                                    <span className="text-[8px] text-primary-foreground font-bold">R</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Playhead - Always visible, high z-index */}
                    <div
                        className="absolute top-0 bottom-0 w-1 bg-red-500 z-50 pointer-events-none"
                        style={{ left: `${playheadX}px`, boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)' }}
                    >
                        {/* Playhead triangle at top */}
                        <div
                            className="absolute -top-3 -left-2.5 w-0 h-0"
                            style={{
                                borderLeft: '10px solid transparent',
                                borderRight: '10px solid transparent',
                                borderTop: '12px solid #ef4444',
                            }}
                        />
                    </div>

                    {/* Track Rows */}
                    {tracks.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                            No tracks. Add a track to start sequencing.
                        </div>
                    ) : (
                        tracks.map((track) => (
                            <div
                                key={track.id}
                                className="relative h-16 border-b border-border cursor-pointer hover:bg-muted/10 transition-colors"
                                onMouseDown={handleTrackMouseDown}
                                onClick={(e) => handleTrackClick(track.id, e)}
                                title="Click to add clip"
                            >
                                {/* Clips for this track */}
                                {clips
                                    .filter((clip) => clip.track_id === track.id)
                                    .map((clip) => (
                                        <SequencerPanelClip
                                            key={clip.id}
                                            clip={clip}
                                            trackColor={track.color}
                                            isSelected={selectedClip === clip.id}
                                            zoom={zoom}
                                            pixelsPerBeat={pixelsPerBeat}
                                            snapEnabled={snapEnabled}
                                            gridSize={gridSize}
                                            onSelect={onSelectClip}
                                            onDuplicate={onDuplicateClip}
                                            onDelete={onDeleteClip}
                                            onMove={onMoveClip}
                                            onResize={onResizeClip}
                                        />
                                    ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

