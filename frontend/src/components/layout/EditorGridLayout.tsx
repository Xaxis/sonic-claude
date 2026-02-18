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

import React, { useCallback } from "react";

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
    // Internal scroll handler - syncs ruler horizontal + sidebar vertical
    const handleMainScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        const scrollLeft = e.currentTarget.scrollLeft;

        // Sync sidebar vertical scroll (CSS Grid sibling)
        const sidebarEl = document.querySelector(`[${sidebarScrollDataAttr}]`) as HTMLDivElement;
        if (sidebarEl && sidebarEl.scrollTop !== scrollTop) {
            sidebarEl.scrollTop = scrollTop;
        }

        // Sync ruler horizontal scroll (CSS Grid sibling)
        const rulerEl = document.querySelector(`[${rulerScrollDataAttr}]`) as HTMLDivElement;
        if (rulerEl && rulerEl.scrollLeft !== scrollLeft) {
            rulerEl.scrollLeft = scrollLeft;
        }

        // Call parent handler for additional sync (e.g., timeline horizontal sync)
        onScroll(e);
    }, [onScroll, rulerScrollDataAttr, sidebarScrollDataAttr]);

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
                {...{ [rulerScrollDataAttr]: "" }}
                className="border-b border-border overflow-x-auto overflow-y-hidden scrollbar-hide"
            >
                <div style={{ width: `${contentWidth}px`, minWidth: `${contentWidth}px` }}>
                    {ruler}
                </div>
            </div>

            {/* Bottom-Left: Sidebar - Scrolls vertically only, synced with main content */}
            <div
                {...{ [sidebarScrollDataAttr]: "" }}
                className="border-r border-border bg-background overflow-y-auto overflow-x-hidden scrollbar-hide"
            >
                {sidebar}
            </div>

            {/* Bottom-Right: Main Content - Scrolls both directions, has scrollbar */}
            <div
                ref={scrollRef}
                className="overflow-auto"
                onScroll={handleMainScroll}
            >
                <div style={{ width: `${contentWidth}px`, minWidth: `${contentWidth}px` }}>
                    {mainContent}
                </div>
            </div>
        </div>
    );
}

