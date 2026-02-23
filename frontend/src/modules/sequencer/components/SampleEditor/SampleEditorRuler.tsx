/**
 * SampleEditorRuler - Timeline ruler for sample editor
 *
 * Displays beat/measure markers and playhead position.
 * Follows the same pattern as SequencerTimelineRuler.
 */

import { useEffect, useRef, useState } from "react";
import { useDAWStore } from '@/stores/dawStore';

interface RulerMarker {
    beat: number;
    x: number;
    isMeasure: boolean;
    label: string;
}

interface SampleEditorRulerProps {
    totalBeats: number; // Total timeline length in beats
    clipDuration: number; // in beats
    clipStartTime: number; // in beats - position in sequence
    currentPosition: number; // current playback position in beats
    isPlaying: boolean;
    zoom: number;
    pixelsPerBeat: number;
    totalWidth: number;
    snapEnabled: boolean;
    gridSize: number;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
}

export function SampleEditorRuler({
    totalBeats,
    clipDuration,
    clipStartTime,
    currentPosition,
    isPlaying,
    zoom,
    pixelsPerBeat,
    totalWidth,
    snapEnabled,
    gridSize,
    onSeek,
}: SampleEditorRulerProps) {
    // Get isPaused from transport WebSocket state
    const transport = useDAWStore(state => state.transport);
    const isPaused = transport?.is_paused ?? false;

    const playheadRef = useRef<HTMLDivElement>(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [draggedPlayheadPosition, setDraggedPlayheadPosition] = useState<number | null>(null);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);
    const beatsPerMeasure = 4;
    const beatWidth = pixelsPerBeat * zoom;

    // Generate ruler markers for entire timeline
    const rulerMarkers: RulerMarker[] = [];
    const totalBeatsToShow = Math.ceil(totalBeats) + 1;

    for (let beat = 0; beat <= totalBeatsToShow; beat++) {
        const x = beat * beatWidth;
        const isMeasure = beat % beatsPerMeasure === 0;
        const measure = Math.floor(beat / beatsPerMeasure) + 1;

        rulerMarkers.push({
            beat,
            x,
            isMeasure,
            label: isMeasure ? `${measure}` : "",
        });
    }

    // Calculate playhead position relative to clip
    const displayPosition = draggedPlayheadPosition !== null ? draggedPlayheadPosition : currentPosition;
    const relativePosition = displayPosition - clipStartTime;
    const isPlayheadInClip = relativePosition >= 0 && relativePosition <= clipDuration;
    const playheadX = relativePosition * beatWidth;

    // Store latest values in refs to avoid animation loop restarts
    const currentPositionRef = useRef(currentPosition);
    const clipStartTimeRef = useRef(clipStartTime);
    const clipDurationRef = useRef(clipDuration);
    const pixelsPerBeatRef = useRef(pixelsPerBeat);
    const zoomRef = useRef(zoom);

    useEffect(() => {
        currentPositionRef.current = currentPosition;
        clipStartTimeRef.current = clipStartTime;
        clipDurationRef.current = clipDuration;
        pixelsPerBeatRef.current = pixelsPerBeat;
        zoomRef.current = zoom;
    }, [currentPosition, clipStartTime, clipDuration, pixelsPerBeat, zoom]);

    // Smooth playhead animation using requestAnimationFrame
    useEffect(() => {
        const relativePos = currentPositionRef.current - clipStartTimeRef.current;
        const isInClip = relativePos >= 0 && relativePos <= clipDurationRef.current;

        if (!playheadRef.current || !isPlaying || isPaused || !isInClip || isDraggingPlayhead) {
            // Not playing, paused, not in clip, or dragging - just use exact position
            if (playheadRef.current && isInClip) {
                const x = (draggedPlayheadPosition !== null ? draggedPlayheadPosition - clipStartTimeRef.current : relativePos) * pixelsPerBeatRef.current * zoomRef.current;
                playheadRef.current.style.transform = `translateX(${x}px)`;
            }
            return;
        }

        // Animation loop for smooth playback
        const animate = () => {
            if (playheadRef.current) {
                const relPos = currentPositionRef.current - clipStartTimeRef.current;
                const x = relPos * pixelsPerBeatRef.current * zoomRef.current;
                playheadRef.current.style.transform = `translateX(${x}px)`;
            }
            requestAnimationFrame(animate);
        };

        const animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, isPaused, isDraggingPlayhead, draggedPlayheadPosition]);

    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onSeek || isDraggingPlayhead) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBeat = clickX / beatWidth;

        // Convert to absolute position in sequence
        const absolutePosition = clipStartTime + clickedBeat;
        onSeek(Math.max(0, absolutePosition), true);
    };

    const handlePlayheadMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        setIsDraggingPlayhead(true);
        dragStartValueRef.current = currentPosition;
        dragStartXRef.current = e.clientX;
    };

    useEffect(() => {
        if (!isDraggingPlayhead) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / beatWidth;
            const newValue = dragStartValueRef.current + deltaBeat;

            // Update local state only during drag (no API calls)
            setDraggedPlayheadPosition(Math.max(0, newValue));
        };

        const handleMouseUp = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / beatWidth;
            let newValue = dragStartValueRef.current + deltaBeat;

            // Snap to grid if enabled
            if (snapEnabled) {
                newValue = Math.round(newValue * gridSize) / gridSize;
            }

            newValue = Math.max(0, newValue);

            // Call seek API once on mouse up
            if (onSeek) {
                onSeek(newValue, true);
            }

            setIsDraggingPlayhead(false);
            setDraggedPlayheadPosition(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingPlayhead, currentPosition, beatWidth, snapEnabled, gridSize, onSeek]);

    return (
        <div
            className="relative h-8 border-b border-border bg-muted/30 flex-shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={handleRulerClick}
            title="Click to seek"
            style={{ width: totalWidth }}
        >
            {/* Ruler markers */}
            <div className="relative h-full pointer-events-none">
                {rulerMarkers.map((marker, index) => (
                    <div
                        key={`${marker.beat}-${index}`}
                        className="absolute top-0 bottom-0 flex flex-col"
                        style={{ left: `${marker.x}px`, transform: 'translateX(-0.5px)' }}
                    >
                        {marker.isMeasure ? (
                            <>
                                <div className="text-xs text-muted-foreground px-1">
                                    {marker.label}
                                </div>
                                <div className="flex-1 w-px bg-border" />
                            </>
                        ) : (
                            <div className="flex-1 w-px bg-border/40 mt-4" />
                        )}
                    </div>
                ))}
            </div>

            {/* Playhead indicator */}
            {isPlayheadInClip && (
                <div
                    ref={playheadRef}
                    className="absolute top-0 bottom-0 w-1 bg-red-500 z-50 cursor-ew-resize pointer-events-auto"
                    style={{
                        transform: `translateX(${playheadX}px)`,
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
                        willChange: 'transform',
                    }}
                    onMouseDown={handlePlayheadMouseDown}
                    title="Drag to scrub"
                >
                    {/* Playhead triangle at top */}
                    <div
                        className="absolute -top-3 -left-2.5 w-0 h-0 pointer-events-none"
                        style={{
                            borderLeft: '10px solid transparent',
                            borderRight: '10px solid transparent',
                            borderTop: '12px solid #ef4444',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

