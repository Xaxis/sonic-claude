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

// ── Quick command slot shown in the chat panel ────────────────────────────
export interface AIQuickCommand {
    label: string;
    prompt: string;
}

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

    // ── Auto-save (history snapshots for undo/redo) ───────────────────────
    /** Whether to periodically create undo history snapshots. */
    autosaveEnabled: boolean;
    /** Interval between snapshots in milliseconds (min 10 000). */
    autosaveIntervalMs: number;

    // ── AI: Model & Intelligence ──────────────────────────────────────────
    /** Claude model used for executing AI requests. */
    aiExecutionModel: "haiku" | "sonnet" | "opus";
    /**
     * Creativity / temperature (0–1). 0 = precise/deterministic,
     * 0.5 = balanced (default), 1.0 = highly creative/unpredictable.
     */
    aiCreativity: number;
    /**
     * How verbose the AI's explanations are.
     * "concise" → 1-2 sentences; "detailed" → full reasoning.
     */
    aiResponseStyle: "concise" | "balanced" | "detailed";

    // ── AI: Context & Memory ──────────────────────────────────────────────
    /** Number of recent chat messages sent as history context (2–20). */
    aiHistoryLength: number;
    /** Include harmonic analysis (key, chords, scale) in AI context. */
    aiIncludeHarmonicContext: boolean;
    /** Include rhythmic analysis (groove, timing, syncopation) in AI context. */
    aiIncludeRhythmicContext: boolean;
    /** Include timbral analysis (energy, brightness, loudness) in AI context. */
    aiIncludeTimbreContext: boolean;

    // ── AI: Behavior ──────────────────────────────────────────────────────
    /** Automatically start playback after the AI makes compositional changes. */
    aiAutoPlayAfterChanges: boolean;
    /**
     * Use intent-based routing so only relevant tools are loaded per request.
     * Disable to always load the full tool set (slower, but maximally flexible).
     */
    aiUseIntentRouting: boolean;

    // ── AI: Inline Prompts ────────────────────────────────────────────────
    /** Show the inline AI prompt popover when long-pressing clips/tracks. */
    inlineAIEnabled: boolean;
    /** Long-press duration in ms before the inline AI popover opens. */
    inlineAILongPressDelay: number;

    // ── AI: Transparency ─────────────────────────────────────────────────
    /** Show the detected routing intent (CREATE_CONTENT, MODIFY_CONTENT, …) in chat. */
    aiShowRoutingIntent: boolean;
    /** Show the full musical context sent to the AI (expandable in each response). */
    aiShowMusicalContext: boolean;

    // ── AI: Quick Commands ────────────────────────────────────────────────
    /** Custom one-click prompt buttons shown at the top of the chat panel. */
    aiQuickCommands: AIQuickCommand[];

    // ── Appearance ────────────────────────────────────────────────────────
    /**
     * UI density: multiplier applied to the html base font-size (16px).
     * 1.0 = standard (16px), 0.875 = compact DAW feel (14px), 0.75 = dense (12px).
     * All rem-based Tailwind utilities scale with this; pixel values stay fixed.
     */
    uiDensity: number;
    setUIDensity: (v: number) => void;

    // ========================================================================
    // ACTIONS
    // ========================================================================
    setMetronomeVolume: (volume: number) => Promise<void>;
    setScrollFollowsPlayhead: (value: boolean) => void;
    setDefaultNoteVelocity: (velocity: number) => void;
    setDefaultNoteDuration: (beats: number) => void;
    setAutosaveEnabled: (enabled: boolean) => void;
    setAutosaveIntervalMs: (ms: number) => void;

    // AI
    setAIExecutionModel: (model: "haiku" | "sonnet" | "opus") => void;
    setAICreativity: (value: number) => void;
    setAIResponseStyle: (style: "concise" | "balanced" | "detailed") => void;
    setAIHistoryLength: (length: number) => void;
    setAIIncludeHarmonicContext: (enabled: boolean) => void;
    setAIIncludeRhythmicContext: (enabled: boolean) => void;
    setAIIncludeTimbreContext: (enabled: boolean) => void;
    setAIAutoPlayAfterChanges: (enabled: boolean) => void;
    setAIUseIntentRouting: (enabled: boolean) => void;
    setInlineAIEnabled: (enabled: boolean) => void;
    setInlineAILongPressDelay: (ms: number) => void;
    setAIShowRoutingIntent: (enabled: boolean) => void;
    setAIShowMusicalContext: (enabled: boolean) => void;
    setAIQuickCommands: (commands: AIQuickCommand[]) => void;
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
            autosaveEnabled:        true,
            autosaveIntervalMs:     60_000, // 1 minute

            // AI: Model & Intelligence
            aiExecutionModel:       "sonnet",
            aiCreativity:           0.5,
            aiResponseStyle:        "balanced",

            // AI: Context & Memory
            aiHistoryLength:        6,
            aiIncludeHarmonicContext: true,
            aiIncludeRhythmicContext: true,
            aiIncludeTimbreContext:   true,

            // AI: Behavior
            aiAutoPlayAfterChanges: false,
            aiUseIntentRouting:     true,

            // AI: Inline
            inlineAIEnabled:         true,
            inlineAILongPressDelay:  500,

            // AI: Transparency
            aiShowRoutingIntent:    false,
            aiShowMusicalContext:   false,

            // Appearance
            uiDensity: 0.875,

            // AI: Quick Commands
            aiQuickCommands: [
                { label: "Make Ambient",    prompt: "Recompose this sequence to be more ambient and atmospheric" },
                { label: "Add Tension",     prompt: "Add rhythmic variation and tension to the drums" },
                { label: "Add Variation",   prompt: "Create a melodic variation on the current theme" },
                { label: "Analyze",         prompt: "Explain the current musical state and suggest improvements" },
            ],

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

            setAutosaveEnabled: (enabled) =>
                set({ autosaveEnabled: enabled }),

            setAutosaveIntervalMs: (ms) =>
                set({ autosaveIntervalMs: Math.max(10_000, ms) }),

            // AI actions
            setAIExecutionModel: (model) => set({ aiExecutionModel: model }),
            setAICreativity: (value) => set({ aiCreativity: Math.max(0, Math.min(1, value)) }),
            setAIResponseStyle: (style) => set({ aiResponseStyle: style }),
            setAIHistoryLength: (length) => set({ aiHistoryLength: Math.max(2, Math.min(20, length)) }),
            setAIIncludeHarmonicContext: (enabled) => set({ aiIncludeHarmonicContext: enabled }),
            setAIIncludeRhythmicContext: (enabled) => set({ aiIncludeRhythmicContext: enabled }),
            setAIIncludeTimbreContext: (enabled) => set({ aiIncludeTimbreContext: enabled }),
            setAIAutoPlayAfterChanges: (enabled) => set({ aiAutoPlayAfterChanges: enabled }),
            setAIUseIntentRouting: (enabled) => set({ aiUseIntentRouting: enabled }),
            setInlineAIEnabled: (enabled) => set({ inlineAIEnabled: enabled }),
            setInlineAILongPressDelay: (ms) => set({ inlineAILongPressDelay: Math.max(250, Math.min(1500, ms)) }),
            setAIShowRoutingIntent: (enabled) => set({ aiShowRoutingIntent: enabled }),
            setAIShowMusicalContext: (enabled) => set({ aiShowMusicalContext: enabled }),
            setAIQuickCommands: (commands) => set({ aiQuickCommands: commands }),
            setUIDensity: (v) => set({ uiDensity: Math.max(0.70, Math.min(1.0, v)) }),
        }),
        {
            name: "sonic-claude-settings",
        }
    )
);
