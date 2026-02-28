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

import { useState, useCallback } from "react";
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
    const [isPreviewingInst, setIsPreviewingInst] = useState(false);
    const [isCreating, setIsCreating]         = useState(false);

    // ── Data ──────────────────────────────────────────────────────────────────

    const { filteredItems, categoryItems, isLoading } = useBrowserItems(activeCategory, searchQuery);
    const samplePreview = useSamplePreview();
    const createTrack   = useDAWStore((s) => s.createTrack);

    // ── Category counts ───────────────────────────────────────────────────────

    const counts = Object.fromEntries(
        BROWSER_CATEGORIES.map(({ id }) => [id, categoryItems(id).length]),
    ) as Record<BrowserCategory, number>;

    // ── Preview helpers ───────────────────────────────────────────────────────

    const isPreviewing = selectedItem?.type === "instrument"
        ? isPreviewingInst
        : samplePreview.playingSampleId === selectedItem?.name;

    const stopAll = useCallback(() => {
        samplePreview.stop();
        setIsPreviewingInst(false);
    }, [samplePreview]);

    const previewItem = useCallback(async (item: BrowserItem) => {
        stopAll();
        if (item.type === "instrument") {
            setIsPreviewingInst(true);
            try {
                await api.audio.previewNote({
                    note: previewNote,
                    velocity: 80,
                    duration: 1.5,
                    synthdef: item.name,
                });
            } catch {
                toast.error("Preview failed — is the audio engine running?");
            }
            // Instrument preview fires once; clear flag after expected duration
            setTimeout(() => setIsPreviewingInst(false), 1600);
        } else {
            await samplePreview.play(item.name);
        }
    }, [previewNote, samplePreview, stopAll]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleSelect = useCallback((item: BrowserItem) => {
        setSelectedItem(item);
    }, []);

    const handleDoubleClick = useCallback((item: BrowserItem) => {
        setSelectedItem(item);
        previewItem(item);
    }, [previewItem]);

    const handlePreviewToggle = useCallback((item: BrowserItem) => {
        const alreadyPreviewing =
            item.type === "instrument"
                ? isPreviewingInst && selectedItem?.id === item.id
                : samplePreview.playingSampleId === item.name;

        if (alreadyPreviewing) {
            stopAll();
        } else {
            setSelectedItem(item);
            previewItem(item);
        }
    }, [isPreviewingInst, samplePreview.playingSampleId, selectedItem, previewItem, stopAll]);

    const handleStripPlayToggle = useCallback(() => {
        if (!selectedItem) return;
        if (isPreviewing) {
            stopAll();
        } else {
            previewItem(selectedItem);
        }
    }, [selectedItem, isPreviewing, previewItem, stopAll]);

    const handleCreateTrack = useCallback(async () => {
        if (!selectedItem || selectedItem.type !== "instrument") return;
        setIsCreating(true);
        try {
            await createTrack(selectedItem.displayName, "midi", selectedItem.name);
            toast.success(`Track "${selectedItem.displayName}" added`);
        } catch {
            toast.error("Failed to create track");
        } finally {
            setIsCreating(false);
        }
    }, [selectedItem, createTrack]);

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

    const subtitle = isLoading
        ? "Loading…"
        : `${counts.all ?? 0} items · ${activeCategory.toUpperCase()}`;

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Panel title="BROWSER" subtitle={subtitle} draggable>

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
                    previewingId={
                        isPreviewingInst
                            ? selectedItem?.id ?? null
                            : selectedItem?.type === "sample" && samplePreview.playingSampleId
                                ? `sample:${samplePreview.playingSampleId}`
                                : null
                    }
                    onSelect={handleSelect}
                    onDoubleClick={handleDoubleClick}
                    onPreviewToggle={handlePreviewToggle}
                    emptyMessage={
                        searchQuery
                            ? `No results for "${searchQuery}"`
                            : isLoading
                                ? "Loading…"
                                : "No items in this category"
                    }
                />

            </div>

            {/* ── Preview strip ─────────────────────────────────────────────── */}
            <BrowserPreviewStrip
                item={selectedItem}
                isPreviewing={isPreviewing}
                previewNote={previewNote}
                onPlayToggle={handleStripPlayToggle}
                onPreviewNoteChange={setPreviewNote}
                onCreateTrack={handleCreateTrack}
                isCreating={isCreating}
            />

        </Panel>
    );
}
