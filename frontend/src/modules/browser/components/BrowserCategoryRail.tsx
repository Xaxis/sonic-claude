/**
 * BrowserCategoryRail
 *
 * Left sidebar of the Sound Browser. One button per top-level category
 * with live item counts. Active category highlighted with left-border accent.
 */

import {
    LayoutGrid,
    Sparkles,
    Drum,
    Piano,
    FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserCategory, CategoryConfig } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Category config
// ─────────────────────────────────────────────────────────────────────────────

export const BROWSER_CATEGORIES: CategoryConfig[] = [
    { id: "all",         label: "ALL",         icon: LayoutGrid  },
    { id: "sounds",      label: "SOUNDS",      icon: Sparkles    },
    { id: "drums",       label: "DRUMS",       icon: Drum        },
    { id: "instruments", label: "INSTRUMENTS", icon: Piano       },
    { id: "samples",     label: "SAMPLES",     icon: FolderOpen  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface BrowserCategoryRailProps {
    activeCategory: BrowserCategory;
    counts: Partial<Record<BrowserCategory, number>>;
    onSelect: (cat: BrowserCategory) => void;
}

export function BrowserCategoryRail({
    activeCategory,
    counts,
    onSelect,
}: BrowserCategoryRailProps) {
    return (
        <div className="flex flex-col w-[136px] flex-shrink-0 border-r border-border/30 py-1 overflow-y-auto">
            {BROWSER_CATEGORIES.map(({ id, label, icon: Icon }) => {
                const isActive = activeCategory === id;
                const count = counts[id] ?? 0;

                return (
                    <button
                        key={id}
                        onClick={() => onSelect(id)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 transition-colors border-l-2 select-none",
                            isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                        )}
                    >
                        <Icon size={12} className="flex-shrink-0" />
                        <span className="flex-1 text-left text-[10px] font-bold tracking-widest">
                            {label}
                        </span>
                        <span
                            className={cn(
                                "text-[9px] tabular-nums font-mono",
                                isActive ? "text-primary/70" : "text-muted-foreground/40",
                            )}
                        >
                            {count > 0 ? count : ""}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
