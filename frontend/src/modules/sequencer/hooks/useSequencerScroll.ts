/**
 * useSequencerScroll Hook
 *
 * Handles scroll synchronization between:
 * 1. Timeline and piano roll (horizontal scroll)
 * 2. Timeline and sample editor (horizontal scroll)
 *
 * Architecture:
 * - Timeline has single scrollbar controlling both axes
 * - Track list uses CSS position:sticky for native browser sync (no JS needed)
 * - Piano roll horizontal scroll is synced bidirectionally
 * - Piano roll vertical scroll is independent (different axis - pitches vs tracks)
 * - Sample editor horizontal scroll is synced bidirectionally
 */

import { useRef, useCallback } from "react";

export function useSequencerScroll() {
    // Refs for scroll containers
    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const pianoRollScrollRef = useRef<HTMLDivElement>(null);
    const sampleEditorScrollRef = useRef<HTMLDivElement>(null);

    // Flag to prevent infinite scroll loops
    const isScrollingRef = useRef(false);

    // Timeline scroll handler - syncs track list vertical + ruler horizontal + piano roll horizontal + sample editor horizontal
    // Uses CSS Grid layout with synchronized scroll containers for perfect performance
    const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        const scrollTop = e.currentTarget.scrollTop;
        const scrollLeft = e.currentTarget.scrollLeft;

        // Sync track list vertical scroll (CSS Grid sibling - vertical only)
        const trackListEl = document.querySelector('[data-track-list]') as HTMLDivElement;
        if (trackListEl && trackListEl.scrollTop !== scrollTop) {
            trackListEl.scrollTop = scrollTop;
        }

        // Sync ruler horizontal scroll (CSS Grid sibling - horizontal only)
        const rulerScrollEl = document.querySelector('[data-ruler-scroll]') as HTMLDivElement;
        if (rulerScrollEl && rulerScrollEl.scrollLeft !== scrollLeft) {
            rulerScrollEl.scrollLeft = scrollLeft;
        }

        // Sync piano roll horizontal scroll
        if (pianoRollScrollRef.current) {
            isScrollingRef.current = true;
            pianoRollScrollRef.current.scrollLeft = scrollLeft;
        }

        // Sync sample editor horizontal scroll
        if (sampleEditorScrollRef.current) {
            isScrollingRef.current = true;
            sampleEditorScrollRef.current.scrollLeft = scrollLeft;
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

    // Sample editor scroll handler - syncs timeline horizontal only
    const handleSampleEditorScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        // Sync timeline horizontal scroll
        if (timelineScrollRef.current) {
            isScrollingRef.current = true;
            timelineScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }, []);

    return {
        timelineScrollRef,
        pianoRollScrollRef,
        sampleEditorScrollRef,
        handleTimelineScroll,
        handlePianoRollScroll,
        handleSampleEditorScroll,
    };
}

