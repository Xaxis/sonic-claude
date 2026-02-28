/**
 * useBrowserItems
 *
 * Aggregates SynthDefs (from Zustand) and Samples (from Zustand store) into a
 * unified BrowserItem list and exposes filtering helpers.
 *
 * All data comes from the DAW store — no independent API fetching.
 * Samples are loaded at app startup via App.tsx and kept fresh by
 * useSampleLibrary mutations calling useDAWStore.getState().loadSamples().
 */

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { useDAWStore } from "@/stores/dawStore";
import { apiConfig } from "@/config/api.config";
import type { BrowserItem, BrowserCategory } from "../types";
import {
    SOUNDS_SYNTH_CATEGORIES,
    INSTRUMENTS_SYNTH_CATEGORIES,
    DRUMS_SYNTH_CATEGORIES,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function synthdefToBrowserCategory(category: string): BrowserCategory {
    if (DRUMS_SYNTH_CATEGORIES.has(category)) return "drums";
    if (INSTRUMENTS_SYNTH_CATEGORIES.has(category)) return "instruments";
    return "sounds";
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface BrowserItemsState {
    items: BrowserItem[];
    /** Items filtered by active category + search query */
    filteredItems: BrowserItem[];
    /** All items in the given category, for counts */
    categoryItems: (cat: BrowserCategory) => BrowserItem[];
}

export function useBrowserItems(
    activeCategory: BrowserCategory,
    searchQuery: string,
): BrowserItemsState {
    const synthDefs = useDAWStore((s) => s.synthDefs);
    const samples   = useDAWStore((s) => s.samples);

    // ── Map SynthDefs → BrowserItem[] ────────────────────────────────────────

    const synthItems = useMemo<BrowserItem[]>(
        () =>
            synthDefs.map((sd) => ({
                id: `synth:${sd.name}`,
                name: sd.name,
                displayName: sd.display_name,
                browserCategory: synthdefToBrowserCategory(sd.category),
                subcategory: sd.category,
                type: "instrument" as const,
                description: sd.description,
                tags: [sd.category.toLowerCase()],
            })),
        [synthDefs],
    );

    // ── Map Samples → BrowserItem[] ──────────────────────────────────────────

    const sampleItems = useMemo<BrowserItem[]>(
        () =>
            samples.map((s) => ({
                id: `sample:${s.id}`,
                name: s.id,
                displayName: s.name,
                browserCategory: "samples" as const,
                subcategory: s.category || "Uncategorized",
                type: "sample" as const,
                duration: s.duration,
                tags: [s.category?.toLowerCase() || "uncategorized"],
            })),
        [samples],
    );

    const allItems = useMemo(
        () => [...synthItems, ...sampleItems],
        [synthItems, sampleItems],
    );

    // ── Filter helpers ────────────────────────────────────────────────────────

    const categoryItems = useCallback(
        (cat: BrowserCategory) =>
            cat === "all" ? allItems : allItems.filter((i) => i.browserCategory === cat),
        [allItems],
    );

    const filteredItems = useMemo(() => {
        const pool =
            activeCategory === "all"
                ? allItems
                : allItems.filter((i) => i.browserCategory === activeCategory);

        if (!searchQuery.trim()) return pool;

        const q = searchQuery.toLowerCase();
        return pool.filter(
            (i) =>
                i.displayName.toLowerCase().includes(q) ||
                i.subcategory.toLowerCase().includes(q) ||
                (i.description?.toLowerCase().includes(q) ?? false),
        );
    }, [allItems, activeCategory, searchQuery]);

    return { items: allItems, filteredItems, categoryItems };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample preview via Web Audio API
// ─────────────────────────────────────────────────────────────────────────────

interface UseSamplePreviewOptions {
    onEnded?: () => void;
}

export function useSamplePreview(opts?: UseSamplePreviewOptions) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

    // Keep onEnded fresh without re-creating play/stop
    const onEndedRef = useRef(opts?.onEnded);
    onEndedRef.current = opts?.onEnded;

    // Cleanup AudioContext on unmount (H5 fix)
    useEffect(() => {
        return () => {
            try { sourceRef.current?.stop(); } catch { /* already stopped */ }
            audioContextRef.current?.close();
        };
    }, []);

    const stop = useCallback(() => {
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch { /* already stopped */ }
            sourceRef.current = null;
        }
        setPlayingSampleId(null);
    }, []);

    const play = useCallback(async (sampleId: string) => {
        stop();
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const url = apiConfig.getURL(`/api/samples/${sampleId}/download`);
            const resp = await fetch(url);
            const buf = await audioContextRef.current.decodeAudioData(await resp.arrayBuffer());
            const src = audioContextRef.current.createBufferSource();
            src.buffer = buf;
            src.connect(audioContextRef.current.destination);
            src.onended = () => {
                sourceRef.current = null;
                setPlayingSampleId(null);
                onEndedRef.current?.();
            };
            src.start();
            sourceRef.current = src;
            setPlayingSampleId(sampleId);
        } catch {
            setPlayingSampleId(null);
        }
    }, [stop]);

    return { play, stop, playingSampleId };
}
