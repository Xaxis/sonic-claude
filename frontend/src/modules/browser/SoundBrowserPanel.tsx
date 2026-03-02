/**
 * SoundBrowserPanel – Ableton-style sound & instrument browser
 *
 * Panel layout (top → bottom):
 *   Search bar            — text search across all items
 *   Body (flex-row)       — category rail (left) | item list (right)
 *   Preview strip         — selected item info, play toggle, note select, add track
 *
 * Categories:
 *   All · Sounds · Drums · Instruments · Samples
 *
 * Future categories (tracked as TODOs):
 *   Audio Effects · MIDI Effects · Grooves · Templates
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { Search, X } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { useDAWStore } from "@/stores/dawStore";
import { api } from "@/services/api";
import { toast } from "sonner";

import type { BrowserItem, BrowserCategory } from "./types";
import { DEFAULT_PREVIEW_NOTE } from "./types";
import { useBrowserItems, useSamplePreview } from "./hooks/useBrowserItems";
import { BrowserCategoryRail, BROWSER_CATEGORIES } from "./components/BrowserCategoryRail";
import { BrowserItemList } from "./components/BrowserItemList";
import { BrowserPreviewStrip } from "./components/BrowserPreviewStrip";

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SoundBrowserPanel() {
    // ── UI state ──────────────────────────────────────────────────────────────

    const [activeCategory, setActiveCategory] = useState<BrowserCategory>("all");
    const [searchQuery, setSearchQuery]       = useState("");
    const [selectedItem, setSelectedItem]     = useState<BrowserItem | null>(null);
    const [previewNote, setPreviewNote]       = useState(DEFAULT_PREVIEW_NOTE);
    const [previewingItemId, setPreviewingItemId] = useState<string | null>(null);
    const [isCreating, setIsCreating]         = useState(false);

    // ── Data ──────────────────────────────────────────────────────────────────

    const { filteredItems, categoryItems } = useBrowserItems(activeCategory, searchQuery);
    const activeComposition = useDAWStore((s) => s.activeComposition);
    const createTrack       = useDAWStore((s) => s.createTrack);

    // ── Sample preview (H6: stable stop ref; H5: AudioContext closed on unmount) ─

    const { play: playSample, stop: stopSample } = useSamplePreview({
        onEnded: () => setPreviewingItemId(null),
    });

    // Pending indicator timer for kit groove preview — cleared on stopAll
    const kitPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Category counts (M2: memoized) ────────────────────────────────────────

    const counts = useMemo(
        () =>
            Object.fromEntries(
                BROWSER_CATEGORIES.map(({ id }) => [id, categoryItems(id).length]),
            ) as Record<BrowserCategory, number>,
        [categoryItems],
    );

    // ── Preview helpers ───────────────────────────────────────────────────────

    // stopAll: cancel the pending indicator timer + stop sample playback
    const stopAll = useCallback(() => {
        if (kitPreviewTimerRef.current) {
            clearTimeout(kitPreviewTimerRef.current);
            kitPreviewTimerRef.current = null;
        }
        stopSample();
        setPreviewingItemId(null);
    }, [stopSample]);

    const previewItem = useCallback(async (item: BrowserItem) => {
        stopAll();
        setPreviewingItemId(item.id);

        if (item.type === "kit") {
            try {
                await api.playback.previewKit({ kit_id: item.kitId! });
            } catch { /* audio engine may not be running */ }

            // Clear preview indicator after the pattern finishes (~2.5s max)
            kitPreviewTimerRef.current = setTimeout(
                () => setPreviewingItemId((prev) => (prev === item.id ? null : prev)),
                2500,
            );
        } else if (item.type === "instrument") {
            try {
                // C1: use api.playback.previewNote (not api.audio)
                await api.playback.previewNote({
                    note: previewNote,
                    velocity: 80,
                    duration: 1.5,
                    synthdef: item.name,
                });
            } catch {
                toast.error("Preview failed — is the audio engine running?");
            }
            // Clear after expected duration; guard against race (another item started)
            setTimeout(
                () => setPreviewingItemId((prev) => (prev === item.id ? null : prev)),
                1600,
            );
        } else {
            await playSample(item.name);
        }
    }, [previewNote, playSample, stopAll]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSelect = useCallback((item: BrowserItem) => {
        setSelectedItem(item);
    }, []);

    const handleDoubleClick = useCallback((item: BrowserItem) => {
        setSelectedItem(item);
        previewItem(item);
    }, [previewItem]);

    // C3: previewingId is single source of truth for both strip and list
    const handlePreviewToggle = useCallback((item: BrowserItem) => {
        if (previewingItemId === item.id) {
            stopAll();
        } else {
            setSelectedItem(item);
            previewItem(item);
        }
    }, [previewingItemId, previewItem, stopAll]);

    const handleStripPlayToggle = useCallback(() => {
        if (!selectedItem) return;
        if (previewingItemId === selectedItem.id) {
            stopAll();
        } else {
            previewItem(selectedItem);
        }
    }, [selectedItem, previewingItemId, previewItem, stopAll]);

    // C2: No toast here — createTrack already fires success/error toast
    const handleCreateTrack = useCallback(async () => {
        if (!selectedItem || !activeComposition) return;
        setIsCreating(true);
        try {
            if (selectedItem.type === "kit") {
                await createTrack(selectedItem.displayName, "midi", undefined, selectedItem.kitId);
            } else if (selectedItem.type === "instrument") {
                await createTrack(selectedItem.displayName, "midi", selectedItem.name);
            } else {
                await createTrack(selectedItem.displayName, "audio");
            }
        } finally {
            setIsCreating(false);
        }
    }, [selectedItem, activeComposition, createTrack]);

    const handleCategorySelect = useCallback((cat: BrowserCategory) => {
        setActiveCategory(cat);
        setSelectedItem(null);
        stopAll();
    }, [stopAll]);

    const handleSearchChange = useCallback((q: string) => {
        setSearchQuery(q);
        if (q && activeCategory !== "all") {
            setActiveCategory("all");
        }
    }, [activeCategory]);

    // ── Subtitle ──────────────────────────────────────────────────────────────

    const subtitle = `${counts.all ?? 0} items · ${activeCategory.toUpperCase()}`;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        // H3: overflow-hidden flex flex-col so internal scroll layout works
        <Panel title="BROWSER" subtitle={subtitle} draggable contentClassName="overflow-hidden flex flex-col">

            {/* ── Search bar ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 flex-shrink-0">
                <Search size={12} className="text-muted-foreground/50 flex-shrink-0" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search sounds, drums, instruments…"
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/30"
                />
                {searchQuery && (
                    <button
                        onClick={() => handleSearchChange("")}
                        className="text-muted-foreground/40 hover:text-foreground transition-colors"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>

            {/* ── Body: category rail + item list ──────────────────────────── */}
            <div className="flex flex-row flex-1 min-h-0 overflow-hidden">

                <BrowserCategoryRail
                    activeCategory={activeCategory}
                    counts={counts}
                    onSelect={handleCategorySelect}
                />

                <BrowserItemList
                    items={filteredItems}
                    selectedId={selectedItem?.id ?? null}
                    previewingId={previewingItemId}
                    onSelect={handleSelect}
                    onDoubleClick={handleDoubleClick}
                    onPreviewToggle={handlePreviewToggle}
                    emptyMessage={
                        searchQuery
                            ? `No results for "${searchQuery}"`
                            : "No items in this category"
                    }
                />

            </div>

            {/* ── Preview strip ─────────────────────────────────────────────── */}
            <BrowserPreviewStrip
                item={selectedItem}
                isPreviewing={previewingItemId === selectedItem?.id}
                previewNote={previewNote}
                onPlayToggle={handleStripPlayToggle}
                onPreviewNoteChange={setPreviewNote}
                onCreateTrack={handleCreateTrack}
                isCreating={isCreating}
                canCreateTrack={!!activeComposition}
            />

        </Panel>
    );
}
