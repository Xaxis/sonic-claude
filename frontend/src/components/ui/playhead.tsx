/**
 * Playhead - GPU-accelerated transport position indicator
 *
 * Single reusable component for all ruler playheads.
 * Drives position via RAF + translateX — no React state updates during playback.
 *
 * Usage pattern:
 *   // Caller keeps fresh values in refs so getX/isVisible never need to change
 *   const contentWidthRef = useRef(800);
 *   const getX = useCallback(() => (posRef.current / dur) * contentWidthRef.current, []);
 *   <Playhead getX={getX} isPlaying={isPlaying} isPaused={isPaused} withCap />
 *
 * For drag-to-seek rulers (piano roll), add interactive + onMouseDown:
 *   <Playhead ... interactive onMouseDown={handleMouseDown} />
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface PlayheadProps {
    /** Returns the X translate-offset in pixels. Called every animation frame. */
    getX: () => number;
    /** Returns true to show, false to hide. Omit to always show. Called every animation frame. */
    isVisible?: () => boolean;
    /** Whether transport is actively playing — drives the RAF loop */
    isPlaying: boolean;
    /** Whether transport is paused — stops RAF loop, applies exact position once */
    isPaused?: boolean;
    /** Render a downward triangle cap at the top of the line */
    withCap?: boolean;
    /** Enable pointer events for drag-to-seek rulers */
    interactive?: boolean;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    className?: string;
}

export function Playhead({
    getX,
    isVisible,
    isPlaying,
    isPaused = false,
    withCap = false,
    interactive = false,
    onMouseDown,
    className,
}: PlayheadProps) {
    const elRef = useRef<HTMLDivElement>(null);

    // Keep callbacks in refs so the RAF effect never re-registers when they change
    const getXRef     = useRef(getX);
    const isVisibleRef = useRef(isVisible);
    useEffect(() => { getXRef.current = getX; });
    useEffect(() => { isVisibleRef.current = isVisible; });

    useEffect(() => {
        const el = elRef.current;
        if (!el) return;

        const apply = () => {
            el.style.transform = `translateX(${getXRef.current()}px)`;
            const vis = isVisibleRef.current;
            el.style.opacity = vis === undefined ? "1" : (vis() ? "1" : "0");
        };

        if (!isPlaying || isPaused) {
            apply();
            return;
        }

        let animId: number;
        const loop = () => { apply(); animId = requestAnimationFrame(loop); };
        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, isPaused]);

    return (
        <div
            ref={elRef}
            className={cn(
                "absolute top-0 bottom-0 w-px bg-red-500 z-10",
                interactive ? "cursor-ew-resize" : "pointer-events-none",
                className,
            )}
            style={{
                left: 0,
                opacity: 0,
                willChange: "transform, opacity",
                boxShadow: "0 0 6px rgba(239,68,68,0.7)",
            }}
            onMouseDown={interactive ? onMouseDown : undefined}
        >
            {withCap && (
                <div
                    className="absolute top-0 -left-1.5 w-0 h-0 pointer-events-none"
                    style={{
                        borderLeft:  "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop:   "8px solid #ef4444",
                    }}
                />
            )}
        </div>
    );
}
