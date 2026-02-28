/**
 * Toolbar Primitives
 *
 * The four building blocks for every horizontal toolbar strip in the app.
 * All toolbars are composed exclusively of these — no ad-hoc inline divs.
 *
 * Visual anatomy:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ ToolbarPill                                                      │
 *   │  ┌──────────────┐ │ ┌──────────────┐ │ ┌─────────────────────┐ │
 *   │  │ToolbarSection│ │ │ToolbarGroup  │ │ │ToolbarSection       │ │
 *   │  │ (content)    │ │ │ (icons)      │ │ │ (labeled content)   │ │
 *   │  └──────────────┘ │ └──────────────┘ │ └─────────────────────┘ │
 *   │              ToolbarDivider        ToolbarDivider               │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   <ToolbarPill>
 *     <ToolbarSection>...</ToolbarSection>
 *     <ToolbarDivider />
 *     <ToolbarGroup>
 *       <IconButton ... />
 *       <IconButton ... />
 *     </ToolbarGroup>
 *     <ToolbarDivider />
 *     <ToolbarSection>...</ToolbarSection>
 *   </ToolbarPill>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── ToolbarPill ─────────────────────────────────────────────────────────────

/**
 * Outer pill container for all toolbar strips.
 * h-10 height, rounded border, dark bg, overflow-hidden for clean edges.
 */
export function ToolbarPill({ children, className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex items-center h-10 rounded-lg border border-border/30 bg-background/80 overflow-hidden",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// ─── ToolbarDivider ───────────────────────────────────────────────────────────

/**
 * Thin full-height vertical hairline separator between toolbar sections.
 * self-stretch ensures it always fills the strip height regardless of content.
 */
export function ToolbarDivider({ className }: { className?: string }) {
    return (
        <div
            aria-hidden
            className={cn("w-px self-stretch bg-border/30 flex-shrink-0", className)}
        />
    );
}

// ─── ToolbarGroup ─────────────────────────────────────────────────────────────

/**
 * Tight flex group for icon buttons.
 * px-1.5 + gap-0.5 is the canonical "icon cluster" spacing.
 * Use for groups of IconButton controls (play/stop, undo/redo, zoom, etc.).
 */
export function ToolbarGroup({
    children,
    className,
    px = "px-1.5",
    gap = "gap-0.5",
    ...props
}: React.ComponentProps<"div"> & { px?: string; gap?: string }) {
    return (
        <div className={cn("flex items-center", px, gap, className)} {...props}>
            {children}
        </div>
    );
}

// ─── ToolbarSection ───────────────────────────────────────────────────────────

/**
 * Content section with standard horizontal padding and h-full so any
 * full-height content (sliders, inputs, select) fills correctly.
 *
 * Use for labeled sections, select controls, or any non-icon-cluster content.
 * Default px-2 / gap-1.5 — override as needed.
 */
export function ToolbarSection({
    children,
    className,
    px = "px-2",
    gap = "gap-1.5",
    ...props
}: React.ComponentProps<"div"> & { px?: string; gap?: string }) {
    return (
        <div className={cn("flex items-center h-full", px, gap, className)} {...props}>
            {children}
        </div>
    );
}
