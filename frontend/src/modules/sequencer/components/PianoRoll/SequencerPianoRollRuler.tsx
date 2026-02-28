/**
 * SequencerPianoRollRuler - Timeline ruler for piano roll
 *
 * REFACTORED: Pure component that reads everything from Zustand
 * - Reads ALL state from Zustand (composition, transport, settings)
 * - Calls seek() action directly
 * - No props needed!
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDAWStore } from '@/stores/dawStore';
import { useTimelineCalculations } from '../../hooks/useTimelineCalculations.ts';



interface SequencerPianoRollRulerProps {
    // No props needed - reads everything from Zustand!
}

export function SequencerPianoRollRuler({}: SequencerPianoRollRulerProps) {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const snapEnabled          = useDAWStore(state => state.snapEnabled);
    const gridSize             = useDAWStore(state => state.gridSize);
    const transport            = useDAWStore(state => state.transport);
    const followPlayback       = useDAWStore(state => state.pianoRollFollowPlayback);
    const pianoRollScrollRef   = useDAWStore(state => state.pianoRollScrollRef);

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
    // DERIVED STATE
    // ========================================================================
    const currentPosition = transport?.position_beats || 0;
    const isPlaying = transport?.is_playing || false;
    const isPaused = transport?.is_paused ?? false;

    const playheadRef = useRef<HTMLDivElement>(null);
    const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
    const [draggedPlayheadPosition, setDraggedPlayheadPosition] = useState<number | null>(null);
    const dragStartXRef = useRef<number>(0);
    const dragStartValueRef = useRef<number>(0);

    // Calculate playhead position (rulerMarkers come from useTimelineCalculations hook)
    const displayPosition = draggedPlayheadPosition !== null ? draggedPlayheadPosition : currentPosition;
    const playheadX = displayPosition * pixelsPerBeat * zoom;

    // Store latest values in refs to avoid animation loop restarts
    const currentPositionRef   = useRef(currentPosition);
    const pixelsPerBeatRef     = useRef(pixelsPerBeat);
    const zoomRef              = useRef(zoom);
    const followPlaybackRef    = useRef(followPlayback);
    const pianoRollScrollRefRef = useRef(pianoRollScrollRef);

    useEffect(() => {
        currentPositionRef.current    = currentPosition;
        pixelsPerBeatRef.current      = pixelsPerBeat;
        zoomRef.current               = zoom;
        followPlaybackRef.current     = followPlayback;
        pianoRollScrollRefRef.current = pianoRollScrollRef;
    }, [currentPosition, pixelsPerBeat, zoom, followPlayback, pianoRollScrollRef]);

    // Refs for drag state — let getX read fresh values without restarting the RAF
    const isDraggingPlayheadRef       = useRef(isDraggingPlayhead);
    const draggedPlayheadPositionRef  = useRef(draggedPlayheadPosition);
    useEffect(() => { isDraggingPlayheadRef.current      = isDraggingPlayhead; },      [isDraggingPlayhead]);
    useEffect(() => { draggedPlayheadPositionRef.current = draggedPlayheadPosition; }, [draggedPlayheadPosition]);

    // Stable position callback — always reads from refs, never triggers effect restarts
    const getPlayheadX = useCallback(() => {
        const pos = isDraggingPlayheadRef.current
            ? (draggedPlayheadPositionRef.current ?? currentPositionRef.current)
            : currentPositionRef.current;
        return pos * pixelsPerBeatRef.current * zoomRef.current;
    }, []);

    // Smooth playhead animation using requestAnimationFrame
    // FIX: Store animId on every frame so the cleanup always cancels the latest frame
    useEffect(() => {
        const el = playheadRef.current;
        if (!el) return;

        const applyScroll = (x: number) => {
            if (!followPlaybackRef.current) return;
            const container = pianoRollScrollRefRef.current?.current;
            if (!container) return;
            const cw = container.clientWidth;
            const rel = x - container.scrollLeft;
            if (rel > cw * 0.8) {
                container.scrollLeft = Math.max(0, x - cw * 0.5);
            } else if (rel < 0) {
                container.scrollLeft = Math.max(0, x - cw * 0.2);
            }
        };

        const apply = () => {
            const x = getPlayheadX();
            el.style.transform = `translateX(${x}px)`;
            applyScroll(x);
        };

        if (!isPlaying || isPaused || isDraggingPlayhead) {
            el.style.transform = `translateX(${getPlayheadX()}px)`;
            return;
        }

        let animId: number;
        const loop = () => { apply(); animId = requestAnimationFrame(loop); };
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, isPaused, isDraggingPlayhead, draggedPlayheadPosition, getPlayheadX]);

    const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isDraggingPlayhead) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBeat = clickX / beatWidth;

        // Apply snap if enabled
        const snappedBeat = snapEnabled
            ? Math.round(clickedBeat * gridSize) / gridSize
            : clickedBeat;

        // Click to seek - trigger audio once at the clicked position
        seek(Math.max(0, snappedBeat), true);
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
            className="relative h-8 cursor-pointer hover:bg-muted/30 transition-colors"
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
            <div
                ref={playheadRef}
                className="absolute top-0 bottom-0 w-px bg-red-500 z-50 cursor-ew-resize pointer-events-auto"
                style={{
                    transform: `translateX(${playheadX}px)`,
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)',
                    willChange: 'transform',
                }}
                onMouseDown={handlePlayheadMouseDown}
                title="Drag to scrub"
            >
                {/* Downward-pointing cap — centred over the 1px line via translateX(-50%) */}
                <div
                    className="absolute top-0 left-0 w-0 h-0 pointer-events-none"
                    style={{
                        transform: 'translateX(-50%)',
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '6px solid #ef4444',
                    }}
                />
            </div>
        </div>
    );
}

