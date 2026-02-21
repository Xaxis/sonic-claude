/**
 * SequencerTimelineLoopRegion - Loop region markers and background
 *
 * Displays loop region with draggable start/end markers.
 * Uses SequencerContext for state management.
 */

import { useEffect, useRef, useState } from "react";
import { useSequencer } from '@/contexts/SequencerContext';

interface SequencerTimelineLoopRegionProps {
    pixelsPerBeat: number;
    onLoopStartChange?: (newLoopStart: number) => void;
    onLoopEndChange?: (newLoopEnd: number) => void;
}

export function SequencerTimelineLoopRegion({
    pixelsPerBeat,
    onLoopStartChange,
    onLoopEndChange,
}: SequencerTimelineLoopRegionProps) {
    // Get state from global context
    const { isLooping, loopStart, loopEnd, zoom, snapEnabled, gridSize } = useSequencer();
    const [isDraggingLoopStart, setIsDraggingLoopStart] = useState(false);
    const [isDraggingLoopEnd, setIsDraggingLoopEnd] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

    const loopStartX = loopStart * pixelsPerBeat * zoom;
    const loopEndX = loopEnd * pixelsPerBeat * zoom;

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

    useEffect(() => {
        if (!isDraggingLoopStart && !isDraggingLoopEnd) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / (pixelsPerBeat * zoom);
            let newValue = dragStartValueRef.current + deltaBeat;

            // Clamp to valid range
            if (isDraggingLoopStart) {
                newValue = Math.max(0, Math.min(newValue, loopEnd - 1));
                if (onLoopStartChange) onLoopStartChange(newValue);
            } else {
                newValue = Math.max(loopStart + 1, newValue);
                if (onLoopEndChange) onLoopEndChange(newValue);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartXRef.current;
            const deltaBeat = deltaX / (pixelsPerBeat * zoom);
            let newValue = dragStartValueRef.current + deltaBeat;

            // Snap to grid if enabled
            if (snapEnabled) {
                newValue = Math.round(newValue * gridSize) / gridSize;
            }

            // Clamp and apply final value
            if (isDraggingLoopStart) {
                newValue = Math.max(0, Math.min(newValue, loopEnd - 1));
                if (onLoopStartChange) onLoopStartChange(newValue);
                setIsDraggingLoopStart(false);
            } else {
                newValue = Math.max(loopStart + 1, newValue);
                if (onLoopEndChange) onLoopEndChange(newValue);
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

    if (!isLooping) return null;

    return (
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
    );
}

