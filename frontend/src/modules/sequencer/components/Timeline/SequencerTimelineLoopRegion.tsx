/**
 * SequencerTimelineLoopRegion - Loop region markers and background
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Uses useTimelineCalculations() for pixelsPerBeat
 * - Calls setLoopStart/setLoopEnd actions directly
 * - No props needed!
 */

import { useEffect, useRef, useState } from "react";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations.ts';

interface SequencerTimelineLoopRegionProps {
    // No props needed - reads everything from Zustand!
}

export function SequencerTimelineLoopRegion({}: SequencerTimelineLoopRegionProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const isLooping = useDAWStore(state => state.isLooping);
    const loopStart = useDAWStore(state => state.loopStart);
    const loopEnd = useDAWStore(state => state.loopEnd);
    const snapEnabled = useDAWStore(state => state.snapEnabled);
    const gridSize = useDAWStore(state => state.gridSize);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const setLoopStart = useDAWStore(state => state.setLoopStart);
    const setLoopEnd = useDAWStore(state => state.setLoopEnd);

    // ========================================================================
    // SHARED TIMELINE CALCULATIONS: Use the same hook as timeline for consistency!
    // ========================================================================
    const { pixelsPerBeat, zoom } = useTimelineCalculations();

    // ========================================================================
    // LOCAL STATE: Drag state
    // ========================================================================
    const [isDraggingLoopStart, setIsDraggingLoopStart] = useState(false);
    const [isDraggingLoopEnd, setIsDraggingLoopEnd] = useState(false);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

    // ========================================================================
    // DERIVED STATE: Calculate positions
    // ========================================================================
    const loopStartX = loopStart * pixelsPerBeat * zoom;
    const loopEndX = loopEnd * pixelsPerBeat * zoom;

    // ========================================================================
    // HANDLERS: Mouse interaction
    // ========================================================================
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
                setLoopStart(newValue);
            } else {
                newValue = Math.max(loopStart + 1, newValue);
                setLoopEnd(newValue);
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
                setLoopStart(newValue);
                setIsDraggingLoopStart(false);
            } else {
                newValue = Math.max(loopStart + 1, newValue);
                setLoopEnd(newValue);
                setIsDraggingLoopEnd(false);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingLoopStart, isDraggingLoopEnd, loopStart, loopEnd, pixelsPerBeat, zoom, snapEnabled, gridSize, setLoopStart, setLoopEnd]);

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

