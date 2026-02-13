/**
 * useSequencerScroll Hook
 *
 * Handles scroll synchronization between:
 * 1. Timeline and track list (vertical scroll)
 * 2. Timeline and piano roll (horizontal scroll)
 *
 * Architecture:
 * - Timeline has single scrollbar controlling both axes
 * - Track list vertical scroll is synced (no scrollbar)
 * - Piano roll horizontal scroll is synced bidirectionally
 * - Piano roll vertical scroll is independent (different axis - pitches vs tracks)
 */

import { useRef, useCallback } from "react";

export function useSequencerScroll() {
    // Refs for scroll containers
    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const pianoRollScrollRef = useRef<HTMLDivElement>(null);

    // Flag to prevent infinite scroll loops
    const isScrollingRef = useRef(false);

    // Timeline scroll handler - syncs track list vertical + piano roll horizontal
    const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        // Sync track list vertical scroll
        const trackListEl = e.currentTarget.querySelector('[data-track-list]') as HTMLDivElement;
        if (trackListEl) {
            trackListEl.scrollTop = e.currentTarget.scrollTop;
        }

        // Sync piano roll horizontal scroll
        if (pianoRollScrollRef.current) {
            isScrollingRef.current = true;
            pianoRollScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }, []);

    // Piano roll scroll handler - syncs timeline horizontal only
    const handlePianoRollScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        // Sync timeline horizontal scroll (NOT vertical - different axes)
        if (timelineScrollRef.current) {
            isScrollingRef.current = true;
            timelineScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }, []);

    return {
        timelineScrollRef,
        pianoRollScrollRef,
        handleTimelineScroll,
        handlePianoRollScroll,
    };
}

