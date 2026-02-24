/**
 * SampleEditorRuler - Timeline ruler for sample editor
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (composition, transport, settings, clip data)
 * - Calls seek() action directly
 * - Only receives clipId prop
 */

import { useEffect, useRef, useState } from "react";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations.ts';

interface SampleEditorRulerProps {
    clipId: string;
}

export function SampleEditorRuler({
    clipId,
}: SampleEditorRulerProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const clips = useDAWStore(state => state.clips);
    const clipDragStates = useDAWStore(state => state.clipDragStates);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);
    const transport = useDAWStore(state => state.transport);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const seek = useDAWStore(state => state.seek);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook as timeline for consistency!
    // ========================================================================
    const { pixelsPerBeat, totalWidth, rulerMarkers, zoom } = useTimelineCalculations();
    const beatWidth = pixelsPerBeat * zoom;

    // ========================================================================
    // DERIVED STATE: Get clip data
    // ========================================================================
    const clip = clips.find(c => c.id === clipId);
    const clipDragState = clipDragStates.get(clipId);

    // Use drag state if available (for real-time sync with timeline)
    const clipStartTime = clipDragState?.startTime ?? clip?.start_time ?? 0;
    const clipDuration = clipDragState?.duration ?? clip?.duration ?? 0;

    const currentPosition = transport?.position_beats || 0;
    const isPlaying = transport?.is_playing || false;
    const isPaused = transport?.is_paused ?? false;

    const playheadRef = useRef<HTMLDivElement>(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [draggedPlayheadPosition, setDraggedPlayheadPosition] = useState<number | null>(null);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

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
        if (isDraggingPlayhead) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBeat = clickX / beatWidth;

        // Convert to absolute position in sequence
        const absolutePosition = clipStartTime + clickedBeat;
        seek(Math.max(0, absolutePosition), true);
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
            seek(newValue, true);

            setIsDraggingPlayhead(false);
            setDraggedPlayheadPosition(null);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingPlayhead, currentPosition, beatWidth, snapEnabled, gridSize, seek]);

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

