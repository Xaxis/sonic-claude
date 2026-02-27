/**
 * Settings Store
 *
 * Persistent user preferences — things that are NOT transient session state.
 *
 * Scope: settings that have no natural home in dawStore (which holds live
 * composition state like zoom, snap, and active clip IDs) or layoutStore
 * (which holds panel arrangement). If a value changes mid-session as part
 * of normal usage, it belongs in dawStore. If it's a "set it and forget it"
 * preference, it belongs here.
 *
 * Persisted to localStorage key: 'sonic-claude-settings'
 *
 * ─── Ownership map ────────────────────────────────────────────────────────
 *  settingsStore      → metronome volume, autosave, inline AI, note defaults,
 *                        scroll-follows-playhead
 *  dawStore           → snap, gridSize, zoom, showMeters, meterMode,
 *                        numClipSlots, launchQuantization  (surfaced in the
 *                        settings modal but owned here)
 *  layoutStore        → sidebarCollapsed, xray state, panel layouts
 * ──────────────────────────────────────────────────────────────────────────
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";

// ============================================================================
// STATE SHAPE
// ============================================================================

interface SettingsState {
    // ── Playback / Metronome ──────────────────────────────────────────────
    /** Metronome click volume, 0–1. Synced to backend on change. */
    metronomeVolume: number;

    // ── Sequencer behavior ────────────────────────────────────────────────
    /** Auto-scroll the timeline so the playhead stays in view during playback. */
    scrollFollowsPlayhead: boolean;

    // ── MIDI note defaults ────────────────────────────────────────────────
    /** Default velocity applied to newly drawn notes (1–127). */
    defaultNoteVelocity: number;
    /** Default duration (in beats) for newly drawn notes. */
    defaultNoteDuration: number;

    // ── AI Assistant ──────────────────────────────────────────────────────
    /** Show the inline AI prompt popover when interacting with clips/tracks. */
    inlineAIEnabled: boolean;

    // ── Auto-save (history snapshots for undo/redo) ───────────────────────
    /** Whether to periodically create undo history snapshots. */
    autosaveEnabled: boolean;
    /** Interval between snapshots in milliseconds (min 10 000). */
    autosaveIntervalMs: number;

    // ========================================================================
    // ACTIONS
    // ========================================================================
    setMetronomeVolume: (volume: number) => Promise<void>;
    setScrollFollowsPlayhead: (value: boolean) => void;
    setDefaultNoteVelocity: (velocity: number) => void;
    setDefaultNoteDuration: (beats: number) => void;
    setInlineAIEnabled: (enabled: boolean) => void;
    setAutosaveEnabled: (enabled: boolean) => void;
    setAutosaveIntervalMs: (ms: number) => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // ── Defaults ────────────────────────────────────────────────────
            metronomeVolume:        0.3,
            scrollFollowsPlayhead:  true,
            defaultNoteVelocity:    100,
            defaultNoteDuration:    0.5,    // 1/8 note at 4/4
            inlineAIEnabled:        true,
            autosaveEnabled:        true,
            autosaveIntervalMs:     60_000, // 1 minute

            // ── Actions ─────────────────────────────────────────────────────

            /**
             * Set metronome volume. Optimistically updates the store, then
             * syncs to the backend engine. Non-fatal if the backend call fails
             * (value is preserved locally).
             */
            setMetronomeVolume: async (volume) => {
                const clamped = Math.max(0, Math.min(1, volume));
                set({ metronomeVolume: clamped });
                try {
                    await api.playback.updateMetronome({ volume: clamped });
                } catch {
                    // Non-critical — metronome volume stored locally regardless
                }
            },

            setScrollFollowsPlayhead: (value) =>
                set({ scrollFollowsPlayhead: value }),

            setDefaultNoteVelocity: (velocity) =>
                set({ defaultNoteVelocity: Math.max(1, Math.min(127, velocity)) }),

            setDefaultNoteDuration: (beats) =>
                set({ defaultNoteDuration: beats }),

            setInlineAIEnabled: (enabled) =>
                set({ inlineAIEnabled: enabled }),

            setAutosaveEnabled: (enabled) =>
                set({ autosaveEnabled: enabled }),

            setAutosaveIntervalMs: (ms) =>
                set({ autosaveIntervalMs: Math.max(10_000, ms) }),
        }),
        {
            name: "sonic-claude-settings",
        }
    )
);
