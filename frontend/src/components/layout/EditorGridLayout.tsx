/**
 * EditorGridLayout - Reusable layout component for timeline-based editors
 *
 * Implements the industry-standard CSS Grid (2x2) synchronized scroll pattern
 * used by Google Sheets, Airtable, Excel Online, and Notion.
 *
 * Architecture:
 * ┌─────────────────┬──────────────────────┐
 * │ Corner Header   │ Ruler (H-scroll)     │ ← Fixed row (headerHeight)
 * ├─────────────────┼──────────────────────┤
 * │ Sidebar         │ Main Content         │
 * │ (V-scroll only) │ (H+V scroll, master) │ ← Scrollable row
 * └─────────────────┴──────────────────────┘
 *       ↑                    ↑
 *   sidebarWidth          Flexible
 *
 * Scroll Synchronization:
 * - Main content scrolls → syncs sidebar vertical scroll
 * - Main content scrolls → syncs ruler horizontal scroll
 * - Minimal JavaScript overhead, GPU-accelerated
 * - No jumpy/laggy scroll behavior
 *
 * Usage:
 * ```tsx
 * <EditorGridLayout
 *   cornerHeader={<div>Tracks</div>}
 *   ruler={<TimelineRuler />}
 *   sidebar={<TrackHeaders />}
 *   mainContent={<TimelineGrid />}
 *   sidebarWidth={256}
 *   headerHeight={32}
 *   contentWidth={10000}
 *   scrollRef={scrollRef}
 *   onScroll={handleScroll}
 * />
 * ```
 */

import React, { useCallback, useRef, useEffect } from "react";

export interface EditorGridLayoutProps {
    // Layout regions (React nodes)
    cornerHeader: React.ReactNode;
    ruler: React.ReactNode;
    sidebar: React.ReactNode;
    mainContent: React.ReactNode;

    // Dimensions
    sidebarWidth?: number; // Default: 256px
    headerHeight?: number; // Default: 32px
    contentWidth: number; // Total width of scrollable content

    // Scroll handling
    scrollRef: React.RefObject<HTMLDivElement>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;

    // Data attributes for scroll sync (optional, defaults provided)
    rulerScrollDataAttr?: string; // Default: "data-ruler-scroll"
    sidebarScrollDataAttr?: string; // Default: "data-sidebar-scroll"
}

export function EditorGridLayout({
    cornerHeader,
    ruler,
    sidebar,
    mainContent,
    sidebarWidth = 256,
    headerHeight = 32,
    contentWidth,
    scrollRef,
    onScroll,
    rulerScrollDataAttr = "data-ruler-scroll",
    sidebarScrollDataAttr = "data-sidebar-scroll",
}: EditorGridLayoutProps) {
    // Use refs instead of querySelector for better performance (Google Sheets pattern)
    const rulerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);

    /**
     * BEST PRACTICE: Use requestAnimationFrame for scroll synchronization
     * This is the pattern used by Google Sheets, Airtable, Excel Online, and Notion
     *
     * Benefits:
     * 1. Batches scroll updates with browser's paint cycle (60fps)
     * 2. Prevents layout thrashing by batching DOM reads/writes
     * 3. GPU-accelerated, smooth scrolling
     * 4. Automatically throttled to display refresh rate
     */
    const handleMainScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        // CRITICAL: Capture scroll values immediately (e.currentTarget becomes null in rAF)
        const scrollTop = e.currentTarget.scrollTop;
        const scrollLeft = e.currentTarget.scrollLeft;

        // Cancel any pending animation frame to avoid stacking updates
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }

        // Schedule scroll sync for next animation frame
        rafRef.current = requestAnimationFrame(() => {
            // Sync sidebar vertical scroll (use ref for better performance)
            if (sidebarRef.current && sidebarRef.current.scrollTop !== scrollTop) {
                sidebarRef.current.scrollTop = scrollTop;
            }

            // Sync ruler horizontal scroll (use ref for better performance)
            if (rulerRef.current && rulerRef.current.scrollLeft !== scrollLeft) {
                rulerRef.current.scrollLeft = scrollLeft;
            }

            rafRef.current = null;
        });

        // Call parent handler for additional sync (e.g., cross-editor sync)
        onScroll(e);
    }, [onScroll]);

    // Cleanup animation frame on unmount
    useEffect(() => {
        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    return (
        <div
            className="flex-1 min-h-0"
            style={{
                display: 'grid',
                gridTemplateColumns: `${sidebarWidth}px 1fr`,
                gridTemplateRows: `${headerHeight}px 1fr`,
            }}
        >
            {/* Top-Left: Corner Header - Fixed, no scroll */}
            <div className="border-r border-b border-border bg-muted/30 flex items-center px-3">
                {cornerHeader}
            </div>

            {/* Top-Right: Ruler - Scrolls horizontally only, synced with main content */}
            <div
                ref={rulerRef}
                {...{ [rulerScrollDataAttr]: "" }}
                className="border-b border-border overflow-x-auto overflow-y-hidden scrollbar-hide"
                style={{
                    // BEST PRACTICE: Use will-change for GPU acceleration (Google Sheets pattern)
                    willChange: 'scroll-position',
                }}
            >
                <div style={{ width: `${contentWidth}px`, minWidth: `${contentWidth}px` }}>
                    {ruler}
                </div>
            </div>

            {/* Bottom-Left: Sidebar - Scrolls vertically only, synced with main content */}
            <div
                ref={sidebarRef}
                {...{ [sidebarScrollDataAttr]: "" }}
                className="border-r border-border bg-background overflow-y-auto overflow-x-hidden scrollbar-hide"
                style={{
                    // BEST PRACTICE: Use will-change for GPU acceleration (Google Sheets pattern)
                    willChange: 'scroll-position',
                }}
            >
                {sidebar}
            </div>

            {/* Bottom-Right: Main Content - Scrolls both directions, has scrollbar */}
            <div
                ref={scrollRef}
                className="overflow-auto"
                onScroll={handleMainScroll}
                style={{
                    // BEST PRACTICE: Use will-change for GPU acceleration (Google Sheets pattern)
                    willChange: 'scroll-position',
                }}
            >
                <div style={{ width: `${contentWidth}px`, minWidth: `${contentWidth}px` }}>
                    {mainContent}
                </div>
            </div>
        </div>
    );
}

