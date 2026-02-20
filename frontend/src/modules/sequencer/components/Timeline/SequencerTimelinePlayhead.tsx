/**
 * SequencerTimelinePlayhead - Playhead indicator with drag support
 *
 * Professional implementation with:
 * - GPU-accelerated rendering (transform instead of left)
 * - requestAnimationFrame for smooth 60fps interpolation
 * - Dead reckoning between WebSocket updates
 * - Instant snap on loop reset
 * Uses SequencerContext for state management.
 */

import { useEffect, useRef, useState } from "react";
import { useSequencerContext } from '@/contexts/SequencerContext';

interface SequencerTimelinePlayheadProps {
    pixelsPerBeat: number;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
}

export function SequencerTimelinePlayhead({
    pixelsPerBeat,
    onSeek,
}: SequencerTimelinePlayheadProps) {
    // Get state from context
    const { state, currentPosition, isPlaying, tempo } = useSequencerContext();
    const { zoom, snapEnabled, gridSize, isLooping, loopStart, loopEnd } = state;

    const loopEnabled = isLooping;  // Alias for compatibility
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [draggedPlayheadPosition, setDraggedPlayheadPosition] = useState<number | null>(null);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

    // Animation state for smooth interpolation
    const playheadRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const targetPositionRef = useRef<number>(currentPosition);
    const interpolatedPositionRef = useRef<number>(currentPosition);
    const lastReceivedPositionRef = useRef<number>(currentPosition);

    // Update target position when currentPosition changes from WebSocket
    useEffect(() => {
        const now = Date.now();
        const positionJumped = Math.abs(currentPosition - lastReceivedPositionRef.current) > 1;

        if (positionJumped) {
            // Loop reset or seek - snap instantly
            interpolatedPositionRef.current = currentPosition;
            targetPositionRef.current = currentPosition;
        } else {
            // Normal update - set as target for interpolation
            targetPositionRef.current = currentPosition;
        }

        lastReceivedPositionRef.current = currentPosition;
        lastUpdateTimeRef.current = now;
    }, [currentPosition]);

    // Smooth animation loop using requestAnimationFrame
    useEffect(() => {
        if (!isPlaying || isDraggingPlayhead) {
            // Not playing or dragging - just use exact position
            interpolatedPositionRef.current = draggedPlayheadPosition ?? currentPosition;
            if (playheadRef.current) {
                const x = interpolatedPositionRef.current * pixelsPerBeat * zoom;
                playheadRef.current.style.transform = `translateX(${x}px)`;
            }
            return;
        }

        // Animation loop for smooth playback
        const animate = () => {
            const now = Date.now();
            const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // seconds

            // Dead reckoning: extrapolate position based on tempo
            const beatsPerSecond = tempo / 60;
            let expectedPosition = targetPositionRef.current + (deltaTime * beatsPerSecond);

            // Clamp to loop boundaries if loop is enabled
            if (loopEnabled) {
                if (expectedPosition >= loopEnd) {
                    // Don't extrapolate past loop end - wait for WebSocket to send loop reset
                    expectedPosition = loopEnd - 0.01; // Just before loop end
                }
            }

            // Smooth interpolation towards expected position
            const lerpFactor = 0.3; // Adjust for smoothness vs accuracy
            interpolatedPositionRef.current += (expectedPosition - interpolatedPositionRef.current) * lerpFactor;

            // Update DOM directly for performance (avoid React re-renders)
            if (playheadRef.current) {
                const x = interpolatedPositionRef.current * pixelsPerBeat * zoom;
                playheadRef.current.style.transform = `translateX(${x}px)`;
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, isDraggingPlayhead, tempo, pixelsPerBeat, zoom, currentPosition, draggedPlayheadPosition, loopEnabled, loopEnd]);

    // Calculate display position for initial render
    const displayPosition = draggedPlayheadPosition !== null ? draggedPlayheadPosition : currentPosition;
    const playheadX = displayPosition * pixelsPerBeat * zoom;

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
            const deltaBeat = deltaX / (pixelsPerBeat * zoom);
            const newValue = dragStartValueRef.current + deltaBeat;

            // Update local state only during drag (no API calls)
            setDraggedPlayheadPosition(Math.max(0, newValue));
        };

        const handleMouseUp = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / (pixelsPerBeat * zoom);
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
    }, [isDraggingPlayhead, currentPosition, pixelsPerBeat, zoom, snapEnabled, gridSize, onSeek]);

    return (
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
    );
}

