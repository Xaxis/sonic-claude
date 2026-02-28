/**
 * useBrowserItems
 *
 * Aggregates SynthDefs (from Zustand) and Samples (from API) into a
 * unified BrowserItem list and exposes filtering helpers.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useDAWStore } from "@/stores/dawStore";
import { api } from "@/services/api";
import { apiConfig } from "@/config/api.config";
import type { SampleMetadata } from "@/services/api/providers";
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

function formatDuration(seconds: number): string {
    const s = Math.floor(seconds);
    const ms = Math.round((seconds - s) * 10);
    return `${s}.${ms}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface BrowserItemsState {
    items: BrowserItem[];
    isLoading: boolean;
    reload: () => void;
    /** Items filtered by active category + search query */
    filteredItems: BrowserItem[];
    /** All items in the active category, for counts */
    categoryItems: (cat: BrowserCategory) => BrowserItem[];
}

export function useBrowserItems(
    activeCategory: BrowserCategory,
    searchQuery: string,
): BrowserItemsState {
    const synthDefs = useDAWStore((s) => s.synthDefs);
    const [samples, setSamples] = useState<SampleMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadSamples = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.samples.getAll();
            setSamples(response.samples);
        } catch {
            // fail silently — samples may not exist yet
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSamples();
    }, [loadSamples]);

    // ── Map SynthDefs → BrowserItem[] ────────────────────────────────────────

    const synthItems: BrowserItem[] = synthDefs.map((sd) => ({
        id: `synth:${sd.name}`,
        name: sd.name,
        displayName: sd.display_name,
        browserCategory: synthdefToBrowserCategory(sd.category),
        subcategory: sd.category,
        type: "instrument" as const,
        description: sd.description,
        tags: [sd.category.toLowerCase()],
    }));

    // ── Map Samples → BrowserItem[] ──────────────────────────────────────────

    const sampleItems: BrowserItem[] = samples.map((s) => ({
        id: `sample:${s.id}`,
        name: s.id,
        displayName: s.name,
        browserCategory: "samples" as const,
        subcategory: s.category || "Uncategorized",
        type: "sample" as const,
        duration: s.duration,
        description: s.duration ? formatDuration(s.duration) : undefined,
        tags: [s.category?.toLowerCase() || "uncategorized"],
    }));

    const allItems: BrowserItem[] = [...synthItems, ...sampleItems];

    // ── Filter helpers ────────────────────────────────────────────────────────

    const categoryItems = useCallback(
        (cat: BrowserCategory) =>
            cat === "all" ? allItems : allItems.filter((i) => i.browserCategory === cat),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [synthDefs, samples],
    );

    const filteredItems = (() => {
        let result = activeCategory === "all"
            ? allItems
            : allItems.filter((i) => i.browserCategory === activeCategory);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (i) =>
                    i.displayName.toLowerCase().includes(q) ||
                    i.subcategory.toLowerCase().includes(q) ||
                    i.description?.toLowerCase().includes(q),
            );
        }

        return result;
    })();

    return {
        items: allItems,
        isLoading,
        reload: loadSamples,
        filteredItems,
        categoryItems,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample preview via Web Audio API (matches useSampleLibrary approach)
// ─────────────────────────────────────────────────────────────────────────────

export function useSamplePreview() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

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
