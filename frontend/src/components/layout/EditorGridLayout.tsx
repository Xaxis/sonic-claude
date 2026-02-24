/**
 * EditorGridLayout - Reusable layout component for timeline-based editors
 *
 * BEST PRACTICE IMPLEMENTATION: Single scroll container with position: sticky
 * This is the industry-standard pattern used by Google Sheets, Airtable, Excel Online, Notion, and all professional DAWs.
 *
 * Architecture:
 * ┌─────────────────┬──────────────────────┐
 * │ Corner Header   │ Ruler                │ ← position: sticky (top: 0)
 * │ (sticky)        │ (sticky top)         │
 * ├─────────────────┼──────────────────────┤
 * │ Track Header 1  │ Timeline Row 1       │
 * │ (sticky left)   │                      │
 * ├─────────────────┼──────────────────────┤
 * │ Track Header 2  │ Timeline Row 2       │
 * │ (sticky left)   │                      │
 * └─────────────────┴──────────────────────┘
 *
 * Key Benefits:
 * - SINGLE scroll container (no JavaScript scroll synchronization needed!)
 * - Perfect scroll sync (CSS handles it natively)
 * - GPU-accelerated (position: sticky is hardware-accelerated)
 * - No lag, no jank, no out-of-sync issues
 * - Simpler code, better performance
 *
 * How it works:
 * - One scrollable container wraps everything
 * - Corner header: position: sticky, top: 0, left: 0, z-index: 3
 * - Ruler: position: sticky, top: 0, z-index: 2
 * - Track headers: position: sticky, left: 0, z-index: 1
 * - Timeline rows: normal flow
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

import React from "react";

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
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;

    // Data attributes (kept for compatibility, but not used for scroll sync anymore)
    rulerScrollDataAttr?: string;
    sidebarScrollDataAttr?: string;
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
}: EditorGridLayoutProps) {
    return (
        <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-auto"
            onScroll={onScroll}
            style={{
                // BEST PRACTICE: Single scroll container
                position: 'relative',
                height: '100%',
            }}
        >
            {/* BEST PRACTICE: Use CSS Grid for layout with sticky columns */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `${sidebarWidth}px ${contentWidth}px`,
                    gridAutoRows: 'auto',
                    minWidth: `${sidebarWidth + contentWidth}px`,
                }}
            >
                {/* Top-Left: Corner Header - Sticky to top-left corner (FIXED, doesn't scroll) */}
                <div
                    className="border-r border-b border-border flex items-center px-3"
                    style={{
                        position: 'sticky',
                        top: 0,
                        left: 0,
                        width: `${sidebarWidth}px`,
                        height: `${headerHeight}px`,
                        zIndex: 40, // Highest z-index (on top of everything)
                        backgroundColor: 'hsl(var(--background))',
                    }}
                >
                    {cornerHeader}
                </div>

                {/* Top-Right: Ruler - Sticky to top, scrolls horizontally UNDER the corner header */}
                <div
                    className="border-b border-border"
                    style={{
                        position: 'sticky',
                        top: 0,
                        width: `${contentWidth}px`,
                        height: `${headerHeight}px`,
                        zIndex: 20, // Below corner header, above timeline
                        backgroundColor: 'hsl(var(--background))',
                        overflow: 'hidden', // Prevent ruler content from bleeding out
                    }}
                >
                    {ruler}
                </div>

                {/* Bottom-Left: Sidebar (Track Headers) - Sticky to left, FIXED horizontally, scrolls vertically */}
                <div
                    className="border-r border-border"
                    style={{
                        position: 'sticky',
                        left: 0,
                        width: `${sidebarWidth}px`,
                        zIndex: 30, // Above timeline, below corner header
                        backgroundColor: 'hsl(var(--background))',
                    }}
                >
                    {sidebar}
                </div>

                {/* Bottom-Right: Main Content (Timeline) - Scrolls UNDER the sidebar */}
                <div
                    style={{
                        width: `${contentWidth}px`,
                    }}
                >
                    {mainContent}
                </div>
            </div>
        </div>
    );
}

