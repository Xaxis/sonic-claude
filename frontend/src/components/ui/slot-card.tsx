/**
 * SlotCard — Generic ordered-slot card primitive
 *
 * Designed for any "named item in a chain" UI: effects chains, insert points,
 * send slots, etc.
 *
 * Layout: left accent border (category) + compact header row + collapsible body
 *
 * Header: [≡ grip]  [⏻ power]  [name / subtitle]  [🗑 hover]  [▾ expand]
 *
 * - Power button = active/bypass toggle; colored with accentColor when on,
 *   muted when off. Universal symbol — no text label needed.
 * - Left border = category / accent color — instant visual identity, zero width cost.
 * - Delete hidden until hover — destructive actions stay out of the way.
 * - Bypassed state dims the whole card; left border fades too.
 */

import React from "react";
import { GripVertical, ChevronDown, Trash2, Power } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button.tsx";
import { THEME_PRIMARY_HSL, THEME_BORDER_HSL } from "@/config/theme.constants";
import { cn } from "@/lib/utils";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface SlotCardProps {
    /** Display name (truncated if needed) */
    name: string;
    /** Optional sub-label shown below the name (e.g. effect category) */
    subtitle?: string;
    /** CSS color value for the left border + power icon accent (hsl / hex) */
    accentColor?: string;

    /** Whether the slot is active (not bypassed). Controls visual state + power icon. */
    active?: boolean;
    onToggleActive?: () => void;

    onDelete?: () => void;

    expanded?: boolean;
    onToggleExpand?: () => void;

    /** Drag state — supplied by parent that manages drag/drop ordering */
    isDragging?: boolean;
    isDragOver?: boolean;

    /** Optional highlight class injected by entity-highlight hooks */
    highlightClass?: string;

    /** Event handlers forwarded from inline-AI hooks */
    aiHandlers?: React.HTMLAttributes<HTMLDivElement>;

    /** Collapsible parameter/detail content */
    children?: React.ReactNode;

    className?: string;

    // Native drag event handlers (React.DragEventHandler)
    onDragStart?: React.DragEventHandler<HTMLDivElement>;
    onDragOver?:  React.DragEventHandler<HTMLDivElement>;
    onDragLeave?: React.DragEventHandler<HTMLDivElement>;
    onDrop?:      React.DragEventHandler<HTMLDivElement>;
    onDragEnd?:   React.DragEventHandler<HTMLDivElement>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SlotCard({
    name,
    subtitle,
    accentColor,
    active = true,
    onToggleActive,
    onDelete,
    expanded = false,
    onToggleExpand,
    isDragging  = false,
    isDragOver  = false,
    highlightClass,
    aiHandlers,
    children,
    className,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
}: SlotCardProps) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={cn(
                "group rounded-sm border border-l-2 transition-all duration-150",
                active
                    ? "bg-card/40 border-border/40 hover:border-border/70"
                    : "bg-muted/5 border-border/15",
                isDragging && "opacity-30 scale-95",
                isDragOver && "ring-1 ring-primary/30 border-primary/50",
                highlightClass,
                className,
            )}
            style={{
                borderLeftColor: active
                    ? (accentColor ?? THEME_PRIMARY_HSL)
                    : THEME_BORDER_HSL,
            }}
            {...aiHandlers}
        >
            {/* ── Header row ────────────────────────────────────── */}
            <div className={cn(
                "flex items-center gap-1.5 px-2",
                subtitle ? "py-1.5" : "py-2",
                !active && "opacity-50",
            )}>

                {/* Drag handle */}
                <GripVertical
                    size={12}
                    className="flex-shrink-0 text-muted-foreground/25 hover:text-muted-foreground/70 cursor-grab active:cursor-grabbing"
                />

                {/* Power / bypass toggle */}
                <button
                    type="button"
                    onClick={onToggleActive}
                    title={active ? "Bypass" : "Enable"}
                    className="flex-shrink-0 rounded p-0.5 transition-all focus:outline-none hover:opacity-70"
                    style={active ? { color: accentColor ?? THEME_PRIMARY_HSL } : undefined}
                >
                    <Power
                        size={12}
                        className={cn(!active && "text-muted-foreground/35")}
                    />
                </button>

                {/* Identity */}
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate leading-tight">
                        {name}
                    </div>
                    {subtitle && (
                        <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wide leading-tight">
                            {subtitle}
                        </div>
                    )}
                </div>

                {/* Delete — visible on group-hover only */}
                <IconButton
                    icon={Trash2}
                    tooltip="Delete"
                    variant="ghost"
                    size="icon-xs"
                    onClick={onDelete}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive flex-shrink-0"
                />

                {/* Expand / collapse */}
                <IconButton
                    icon={ChevronDown}
                    tooltip={expanded ? "Collapse" : "Expand"}
                    variant="ghost"
                    size="icon-xs"
                    onClick={onToggleExpand}
                    className={cn(
                        "flex-shrink-0 transition-transform duration-200",
                        expanded && "[&_svg]:rotate-180",
                    )}
                />
            </div>

            {/* ── Expanded body ─────────────────────────────────── */}
            {expanded && children && (
                <div className="border-t border-border/20 bg-black/20 px-2.5 py-2 space-y-2 rounded-b">
                    {children}
                </div>
            )}
        </div>
    );
}
