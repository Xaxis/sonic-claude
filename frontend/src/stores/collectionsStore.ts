/**
 * Collections Store
 *
 * Single source of truth for all catalog/discovery data:
 * synthdefs, drum kits, and samples.
 *
 * All three are "collections" — read-only catalog items that users
 * browse and load into their project. They follow the same load pattern:
 *   loadAll()          → parallel fetch of all three
 *   reload(key)        → refresh a single collection (e.g. after sample upload)
 */

import { create } from "zustand";
import { api } from "@/services/api";
import { windowManager } from "@/services/window-manager";
import type { SynthDefInfo, DrumKitInfo, SampleMetadata } from "@/services/api/providers/collections.provider";

// Re-export for consumers
export type { SynthDefInfo, DrumKitInfo, SampleMetadata };

// ============================================================================
// TYPES
// ============================================================================

export type CollectionKey = "synthdefs" | "drumkits" | "samples";

interface CollectionsState {
    synthdefs: SynthDefInfo[];
    drumkits: DrumKitInfo[];
    samples: SampleMetadata[];
    isLoading: boolean;

    loadAll: () => Promise<void>;
    reload: (key: CollectionKey) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useCollectionsStore = create<CollectionsState>()((set, get) => ({
    synthdefs: [],
    drumkits: [],
    samples: [],
    isLoading: false,

    loadAll: async () => {
        set({ isLoading: true });
        try {
            const [synthdefs, drumkits, samples] = await Promise.all([
                api.collections.synthdefs(),
                api.collections.drumkits(),
                api.collections.samples(),
            ]);
            set({ synthdefs, drumkits, samples });
            windowManager.broadcastState("samples", samples);
        } catch (error) {
            console.error("Failed to load collections:", error);
        } finally {
            set({ isLoading: false });
        }
    },

    reload: async (key: CollectionKey) => {
        try {
            if (key === "synthdefs") {
                const synthdefs = await api.collections.synthdefs();
                set({ synthdefs });
            } else if (key === "drumkits") {
                const drumkits = await api.collections.drumkits();
                set({ drumkits });
            } else if (key === "samples") {
                const samples = await api.collections.samples();
                set({ samples });
                windowManager.broadcastState("samples", samples);
            }
        } catch (error) {
            console.error(`Failed to reload collection '${key}':`, error);
        }
    },
}));
