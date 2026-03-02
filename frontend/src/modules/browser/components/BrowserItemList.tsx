/**
 * BrowserItemList
 *
 * Scrollable list of BrowserItems grouped by subcategory.
 * Each row shows: name · type badge · duration (samples) · hover play button.
 *
 * Groups are sorted alphabetically; items within each group are sorted by displayName.
 *
 * Interactions:
 *   • Click        → select item (populates preview strip)
 *   • Double-click → trigger onDoubleClick (caller decides action)
 *   • Hover ▶      → play preview inline
 */

import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { BrowserItem } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function GroupHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center gap-2 px-3 pt-3 pb-1 sticky top-0 bg-background z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                {label}
            </span>
            <span className="text-[9px] text-muted-foreground/30 tabular-nums">{count}</span>
            <div className="flex-1 h-px bg-border/20" />
        </div>
    );
}

function TypeBadge({ type }: { type: BrowserItem["type"] }) {
    return (
        <span
            className={cn(
                "text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded",
                type === "instrument"
                    ? "bg-primary/10 text-primary/70"
                    : type === "kit"
                        ? "bg-cyan-500/10 text-cyan-400/70"
                        : "bg-amber-500/10 text-amber-400/70",
            )}
        >
            {type === "instrument" ? "INST" : type === "kit" ? "KIT" : "SMPL"}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface BrowserItemListProps {
    items: BrowserItem[];
    selectedId: string | null;
    previewingId: string | null;
    onSelect: (item: BrowserItem) => void;
    onDoubleClick: (item: BrowserItem) => void;
    onPreviewToggle: (item: BrowserItem) => void;
    emptyMessage?: string;
    error?: string;
}

export function BrowserItemList({
    items,
    selectedId,
    previewingId,
    onSelect,
    onDoubleClick,
    onPreviewToggle,
    emptyMessage = "No items found",
    error,
}: BrowserItemListProps) {

    if (error) {
        return (
            <div className="flex flex-1 min-h-0">
                <EmptyState title="Failed to load" description={error} />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <span className="text-xs text-muted-foreground/40 uppercase tracking-wider">
                    {emptyMessage}
                </span>
            </div>
        );
    }

    // ── Group by subcategory ──────────────────────────────────────────────────

    const groups: Map<string, BrowserItem[]> = new Map();
    for (const item of items) {
        const group = groups.get(item.subcategory) ?? [];
        group.push(item);
        groups.set(item.subcategory, group);
    }

    // Sort groups alphabetically; sort items within each group by displayName
    const sortedEntries = Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b));
    for (const [, groupItems] of sortedEntries) {
        groupItems.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    return (
        <div className="flex-1 overflow-y-auto min-h-0">
            {sortedEntries.map(([subcategory, groupItems]) => (
                <div key={subcategory}>
                    <GroupHeader label={subcategory} count={groupItems.length} />

                    {groupItems.map((item) => {
                        const isSelected   = selectedId   === item.id;
                        const isPreviewing = previewingId === item.id;

                        return (
                            <div
                                key={item.id}
                                onClick={() => onSelect(item)}
                                onDoubleClick={() => onDoubleClick(item)}
                                className={cn(
                                    "group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors select-none",
                                    isSelected
                                        ? "bg-primary/15 text-primary"
                                        : "hover:bg-muted/30 text-foreground",
                                )}
                            >
                                {/* Item name */}
                                <span
                                    className={cn(
                                        "flex-1 text-xs truncate",
                                        isSelected ? "font-semibold" : "font-medium",
                                    )}
                                >
                                    {item.displayName}
                                </span>

                                {/* Type badge — always visible */}
                                <TypeBadge type={item.type} />

                                {/* Duration for samples */}
                                {item.duration !== undefined && (
                                    <span className="text-[9px] tabular-nums text-muted-foreground/50 font-mono w-10 text-right">
                                        {item.duration.toFixed(1)}s
                                    </span>
                                )}

                                {/* Play toggle — visible on hover or when previewing */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPreviewToggle(item);
                                    }}
                                    className={cn(
                                        "flex-shrink-0 p-1 rounded transition-colors",
                                        isPreviewing
                                            ? "text-red-400 bg-red-500/10"
                                            : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10",
                                    )}
                                    title={isPreviewing ? "Stop preview" : "Preview"}
                                >
                                    {isPreviewing
                                        ? <Square size={10} />
                                        : <Play  size={10} />
                                    }
                                </button>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
