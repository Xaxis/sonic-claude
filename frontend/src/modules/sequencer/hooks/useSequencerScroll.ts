/**
 * useSequencerScroll Hook
 *
 * BEST PRACTICES IMPLEMENTATION (Google Sheets, Airtable, Excel Online, Notion pattern):
 * 1. Uses requestAnimationFrame for smooth 60fps scroll synchronization
 * 2. Batches DOM reads/writes to prevent layout thrashing
 * 3. GPU-accelerated with will-change CSS property (applied in EditorGridLayout)
 * 4. Cancels pending animation frames to avoid stacking updates
 * 5. Uses refs instead of querySelector for better performance
 *
 * Handles scroll synchronization between:
 * 1. Timeline and piano roll (horizontal scroll)
 * 2. Timeline and sample editor (horizontal scroll)
 *
 * Architecture:
 * - Timeline has single scrollbar controlling both axes
 * - Track list vertical + ruler horizontal sync is handled internally by EditorGridLayout
 * - Piano roll horizontal scroll is synced bidirectionally (cross-editor sync)
 * - Piano roll vertical scroll is independent (different axis - pitches vs tracks)
 * - Sample editor horizontal scroll is synced bidirectionally (cross-editor sync)
 */

import { useRef, useCallback, useEffect } from "react";

export function useSequencerScroll() {
    // Refs for scroll containers
    const timelineScrollRef = useRef<HTMLDivElement>(null);
    const pianoRollScrollRef = useRef<HTMLDivElement>(null);
    const sampleEditorScrollRef = useRef<HTMLDivElement>(null);

    // Flag to prevent infinite scroll loops
    const isScrollingRef = useRef(false);

    // requestAnimationFrame ID for cleanup
    const rafRef = useRef<number | null>(null);

    /**
     * Timeline scroll handler - syncs piano roll horizontal + sample editor horizontal
     * Note: Track list vertical + ruler horizontal sync is handled internally by EditorGridLayout
     *
     * BEST PRACTICE: Uses requestAnimationFrame to batch scroll updates with browser's paint cycle
     * This is the exact pattern used by Google Sheets, Airtable, Excel Online, and Notion
     */
    const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        // CRITICAL: Capture scroll value immediately (e.currentTarget becomes null in rAF)
        const scrollLeft = e.currentTarget.scrollLeft;

        // Cancel any pending animation frame to avoid stacking updates
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }

        // Schedule scroll sync for next animation frame (60fps, GPU-accelerated)
        rafRef.current = requestAnimationFrame(() => {
            // Sync piano roll horizontal scroll (cross-editor sync)
            if (pianoRollScrollRef.current && pianoRollScrollRef.current.scrollLeft !== scrollLeft) {
                isScrollingRef.current = true;
                pianoRollScrollRef.current.scrollLeft = scrollLeft;
            }

            // Sync sample editor horizontal scroll (cross-editor sync)
            if (sampleEditorScrollRef.current && sampleEditorScrollRef.current.scrollLeft !== scrollLeft) {
                isScrollingRef.current = true;
                sampleEditorScrollRef.current.scrollLeft = scrollLeft;
            }

            rafRef.current = null;
        });
    }, []);

    /**
     * Piano roll scroll handler - syncs timeline horizontal only
     * BEST PRACTICE: Uses requestAnimationFrame for smooth scroll sync
     */
    const handlePianoRollScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        // CRITICAL: Capture scroll value immediately (e.currentTarget becomes null in rAF)
        const scrollLeft = e.currentTarget.scrollLeft;

        // Cancel any pending animation frame
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }

        // Schedule scroll sync for next animation frame
        rafRef.current = requestAnimationFrame(() => {
            // Sync timeline horizontal scroll (NOT vertical - different axes)
            if (timelineScrollRef.current && timelineScrollRef.current.scrollLeft !== scrollLeft) {
                isScrollingRef.current = true;
                timelineScrollRef.current.scrollLeft = scrollLeft;
            }

            rafRef.current = null;
        });
    }, []);

    /**
     * Sample editor scroll handler - syncs timeline horizontal only
     * BEST PRACTICE: Uses requestAnimationFrame for smooth scroll sync
     */
    const handleSampleEditorScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // Prevent infinite loop
        if (isScrollingRef.current) {
            isScrollingRef.current = false;
            return;
        }

        // CRITICAL: Capture scroll value immediately (e.currentTarget becomes null in rAF)
        const scrollLeft = e.currentTarget.scrollLeft;

        // Cancel any pending animation frame
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }

        // Schedule scroll sync for next animation frame
        rafRef.current = requestAnimationFrame(() => {
            // Sync timeline horizontal scroll
            if (timelineScrollRef.current && timelineScrollRef.current.scrollLeft !== scrollLeft) {
                isScrollingRef.current = true;
                timelineScrollRef.current.scrollLeft = scrollLeft;
            }

            rafRef.current = null;
        });
    }, []);

    // Cleanup animation frame on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
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

