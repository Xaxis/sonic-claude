/**
 * InstrumentPicker — Universal sound/instrument selector
 *
 * A compact Popover-based picker that works in any context:
 * track headers (collapsed & expanded), mixer strips, clip launchers, etc.
 *
 * Architecture:
 * - Radix Popover (NOT Select) → doesn't close on internal interaction
 * - 4 tabs matching the Sound Browser: Sounds | Drums | Instruments | Samples
 * - Shared data via useBrowserItems hook (same source as Sound Browser)
 * - Per-item preview via api.playback.previewNote / previewKit
 *
 * Size variants:
 *   xs  — 22px trigger, for collapsed track headers (name chip only)
 *   sm  — 26px trigger, for expanded headers + mixer strips
 *   md  — 30px trigger, for standalone usage
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Music, Drumstick, Search, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDAWStore } from "@/stores/dawStore";
import { useCollectionsStore } from "@/stores/collectionsStore";
import { api } from "@/services/api";
import type { BrowserItem, BrowserCategory } from "@/modules/browser/types";
import { useBrowserItems } from "@/modules/browser/hooks/useBrowserItems";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PickerSize = "xs" | "sm" | "md";

interface InstrumentPickerProps {
    trackId: string;
    size?: PickerSize;
    disabled?: boolean;
    className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab configuration
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: BrowserCategory; label: string }[] = [
    { id: "sounds",      label: "Synths" },
    { id: "drums",       label: "Drums" },
    { id: "instruments", label: "Instru." },
    { id: "samples",     label: "Samples" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_HEIGHT: Record<PickerSize, string> = {
    xs: "h-[22px] text-[10px] px-1.5 gap-1",
    sm: "h-[26px] text-[11px] px-2 gap-1.5",
    md: "h-[30px] text-xs     px-2.5 gap-1.5",
};

const ICON_SIZE: Record<PickerSize, number> = { xs: 10, sm: 11, md: 12 };

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function InstrumentPicker({
    trackId,
    size = "sm",
    disabled = false,
    className,
}: InstrumentPickerProps) {
    // ── Store ─────────────────────────────────────────────────────────────────
    const track       = useDAWStore((s) => s.tracks.find((t) => t.id === trackId));
    const updateTrack = useDAWStore((s) => s.updateTrack);
    const drumKits    = useCollectionsStore((s) => s.drumkits);
    const synthDefs   = useCollectionsStore((s) => s.synthdefs);

    // ── Popover state ─────────────────────────────────────────────────────────
    const [open, setOpen] = useState(false);

    // ── Tab + search state (reset on close) ───────────────────────────────────
    const [activeTab, setActiveTab]     = useState<BrowserCategory>("sounds");
    const [searchQuery, setSearchQuery] = useState("");

    // ── Preview state ─────────────────────────────────────────────────────────
    const [previewingId, setPreviewingId] = useState<string | null>(null);
    const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { filteredItems } = useBrowserItems(activeTab, searchQuery);

    // ── Reset state when closed ───────────────────────────────────────────────
    const handleOpenChange = useCallback((next: boolean) => {
        setOpen(next);
        if (!next) {
            setSearchQuery("");
            if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
            setPreviewingId(null);
        }
    }, []);

    // Cleanup preview timer on unmount
    useEffect(() => {
        return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current); };
    }, []);

    // ── Derive display name + icon ────────────────────────────────────────────
    const { displayName, isDrum } = useMemo(() => {
        if (!track) return { displayName: "—", isDrum: false };
        if (track.kit_id) {
            const kit = drumKits.find((k) => k.id === track.kit_id);
            return { displayName: kit?.name ?? track.kit_id, isDrum: true };
        }
        if (track.instrument) {
            const sd = synthDefs.find((s) => s.name === track.instrument);
            return { displayName: sd?.display_name ?? track.instrument, isDrum: false };
        }
        return { displayName: "No sound", isDrum: false };
    }, [track, drumKits, synthDefs]);

    // ── Determine currently selected item id ─────────────────────────────────
    const currentItemId = track?.kit_id
        ? `kit:${track.kit_id}`
        : track?.instrument
            ? `synth:${track.instrument}`
            : undefined;

    // ── Preview ───────────────────────────────────────────────────────────────
    const handlePreview = useCallback(async (item: BrowserItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        setPreviewingId(item.id);

        try {
            if (item.type === "kit") {
                await api.playback.previewKit({ kit_id: item.kitId! });
                previewTimerRef.current = setTimeout(
                    () => setPreviewingId((p) => (p === item.id ? null : p)),
                    2500,
                );
            } else if (item.type === "instrument") {
                await api.playback.previewNote({ note: 60, velocity: 80, duration: 1.5, synthdef: item.name });
                previewTimerRef.current = setTimeout(
                    () => setPreviewingId((p) => (p === item.id ? null : p)),
                    1600,
                );
            }
        } catch {
            setPreviewingId(null);
        }
    }, []);

    // ── Selection ─────────────────────────────────────────────────────────────
    const handleSelect = useCallback((item: BrowserItem) => {
        if (item.type === "kit") {
            updateTrack(trackId, { kit_id: item.kitId! });
        } else if (item.type === "instrument") {
            updateTrack(trackId, { instrument: item.name });
        }
        // Samples: no-op for now (sample tracks need different flow)
        setOpen(false);
    }, [trackId, updateTrack]);

    // ── Auto-switch tab to where the current item lives ───────────────────────
    useEffect(() => {
        if (open && currentItemId) {
            if (currentItemId.startsWith("kit:")) setActiveTab("drums");
            // For synth instruments, we'd need to look up the category — skip for now,
            // browser remembers whatever tab you last used
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─────────────────────────────────────────────────────────────────────────
    // Group filtered items by subcategory
    // ─────────────────────────────────────────────────────────────────────────

    const grouped = useMemo(() => {
        const groups: Record<string, BrowserItem[]> = {};
        for (const item of filteredItems) {
            if (!groups[item.subcategory]) groups[item.subcategory] = [];
            groups[item.subcategory].push(item);
        }
        return groups;
    }, [filteredItems]);

    if (!track) return null;

    const iconSz = ICON_SIZE[size];
    const TriggerIcon = isDrum ? Drumstick : Music;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>

            {/* ── Trigger ────────────────────────────────────────────────── */}
            <PopoverPrimitive.Trigger asChild>
                <button
                    disabled={disabled}
                    className={cn(
                        "flex items-center rounded border border-border/50 bg-background/60",
                        "hover:border-border hover:bg-muted/50 transition-colors",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "max-w-[144px] min-w-0",
                        open && "border-border bg-muted/50",
                        TRIGGER_HEIGHT[size],
                        className,
                    )}
                >
                    <TriggerIcon size={iconSz} className="flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-left font-medium">{displayName}</span>
                    <ChevronDown
                        size={iconSz}
                        className={cn("flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                    />
                </button>
            </PopoverPrimitive.Trigger>

            {/* ── Popover content ────────────────────────────────────────── */}
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    align="start"
                    side="bottom"
                    sideOffset={4}
                    className={cn(
                        "z-[9999] w-[300px] rounded-md border border-border bg-card shadow-xl",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out",
                        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
                    )}
                >

                    {/* ── Tab bar ─────────────────────────────────────────── */}
                    <div className="flex gap-0.5 p-1.5 border-b border-border/50">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                                className={cn(
                                    "flex-1 rounded px-1 py-0.5 text-[10px] font-medium transition-colors",
                                    activeTab === tab.id
                                        ? "bg-primary/20 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Search ──────────────────────────────────────────── */}
                    <div className="relative flex items-center gap-2 px-2 py-1.5 border-b border-border/30">
                        <Search size={11} className="absolute left-3.5 text-muted-foreground/50 pointer-events-none" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search…"
                            className="w-full bg-transparent pl-5 pr-5 text-[11px] outline-none placeholder:text-muted-foreground/40"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 text-muted-foreground/40 hover:text-foreground"
                            >
                                <X size={10} />
                            </button>
                        )}
                    </div>

                    {/* ── Item list ───────────────────────────────────────── */}
                    <div className="max-h-[320px] overflow-y-auto overscroll-contain">
                        {Object.keys(grouped).length === 0 ? (
                            <div className="py-8 text-center text-[11px] text-muted-foreground/50">
                                No results
                            </div>
                        ) : (
                            Object.entries(grouped).map(([subcategory, items]) => (
                                <div key={subcategory}>
                                    {/* Subcategory header */}
                                    <div className="sticky top-0 z-10 bg-card/95 px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                        {subcategory}
                                    </div>

                                    {/* Items */}
                                    {items.map((item) => {
                                        const isSelected = item.id === currentItemId;
                                        const isPreviewing = item.id === previewingId;

                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelect(item)}
                                                className={cn(
                                                    "group w-full flex items-center gap-2 px-3 py-1.5 text-left",
                                                    "transition-colors hover:bg-muted/40",
                                                    isSelected && "bg-primary/10 text-primary",
                                                )}
                                            >
                                                {/* Item name + description */}
                                                <div className="min-w-0 flex-1">
                                                    <div className={cn(
                                                        "truncate text-[11px] font-medium",
                                                        isSelected ? "text-primary" : "text-foreground",
                                                    )}>
                                                        {item.displayName}
                                                    </div>
                                                    {item.description && (
                                                        <div className="truncate text-[9px] text-muted-foreground/50">
                                                            {item.description}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Preview button — visible on row hover */}
                                                {item.type !== "sample" && (
                                                    <button
                                                        onClick={(e) => handlePreview(item, e)}
                                                        className={cn(
                                                            "flex-shrink-0 rounded p-0.5 transition-colors",
                                                            "opacity-0 group-hover:opacity-100",
                                                            isPreviewing
                                                                ? "text-primary opacity-100"
                                                                : "text-muted-foreground hover:text-foreground",
                                                        )}
                                                        title="Preview"
                                                    >
                                                        <Volume2 size={11} />
                                                    </button>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>

        </PopoverPrimitive.Root>
    );
}
