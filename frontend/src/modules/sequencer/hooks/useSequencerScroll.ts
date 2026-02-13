/**
 * useSequencerScroll Hook
 * 
 * Handles scroll synchronization between timeline and track list.
 * 
 * Architecture:
 * - Single scrollbar on timeline container
 * - Track list is absolutely positioned with overflow-hidden
 * - Timeline scroll event updates track list scrollTop
 * - Prevents dual scrollbar stuttering
 */

import { useRef, useCallback } from "react";

export function useSequencerScroll() {
    // Ref for timeline scroll container
    const timelineScrollRef = useRef<HTMLDivElement>(null);

    // Synchronized scroll handler - timeline controls track list scroll
    const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const trackListEl = e.currentTarget.querySelector('[data-track-list]') as HTMLDivElement;
        if (trackListEl) {
            trackListEl.scrollTop = e.currentTarget.scrollTop;
        }
    }, []);

    return {
        timelineScrollRef,
        handleTimelineScroll,
    };
}

