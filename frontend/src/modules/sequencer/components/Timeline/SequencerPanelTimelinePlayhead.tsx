/**
 * SequencerPanelTimelinePlayhead - Playhead indicator with drag support
 * 
 * Displays the current playback position as a red vertical bar with triangle.
 * Supports dragging to scrub through the timeline.
 */

import { useEffect, useRef, useState } from "react";

interface SequencerPanelTimelinePlayheadProps {
    currentPosition: number;
    pixelsPerBeat: number;
    zoom: number;
    snapEnabled: boolean;
    gridSize: number;
    onSeek?: (position: number, triggerAudio?: boolean) => void;
}

export function SequencerPanelTimelinePlayhead({
    currentPosition,
    pixelsPerBeat,
    zoom,
    snapEnabled,
    gridSize,
    onSeek,
}: SequencerPanelTimelinePlayheadProps) {
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [draggedPlayheadPosition, setDraggedPlayheadPosition] = useState<number | null>(null);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

    // Calculate playhead position (use dragged position during drag, otherwise use current position)
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
            className="absolute top-0 bottom-0 w-1 bg-red-500 z-50 cursor-ew-resize pointer-events-auto"
            style={{ left: `${playheadX}px`, boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)' }}
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

