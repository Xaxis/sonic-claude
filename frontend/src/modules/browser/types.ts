/**
 * Sound Browser – shared types
 */

export type BrowserCategory = "all" | "sounds" | "drums" | "instruments" | "samples";

export type BrowserItemType = "instrument" | "sample" | "kit";

export interface BrowserItem {
    /** Unique key — synthdef name or sample id or kit:${kitId} */
    id: string;
    /** Raw name used by the engine (synthdef name or sample id) */
    name: string;
    /** Human-readable display name */
    displayName: string;
    /** Top-level browser category this item appears under */
    browserCategory: BrowserCategory;
    /** Fine-grained sub-group (e.g. "Piano", "Kick", "Basic", "Pad") */
    subcategory: string;
    type: BrowserItemType;
    description?: string;
    /** Audio duration in seconds — samples only */
    duration?: number;
    tags: string[];
    /** Kit ID — only for type === "kit" */
    kitId?: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// Category metadata used by the rail
// ─────────────────────────────────────────────────────────────────────────────

import type { LucideIcon } from "lucide-react";

export interface CategoryConfig {
    id: BrowserCategory;
    label: string;
    icon: LucideIcon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview note options
// ─────────────────────────────────────────────────────────────────────────────

export const PREVIEW_NOTES = [
    { midi: 36, label: "C2" },
    { midi: 48, label: "C3" },
    { midi: 60, label: "C4" },
    { midi: 72, label: "C5" },
    { midi: 84, label: "C6" },
] as const;

export const DEFAULT_PREVIEW_NOTE = 60; // C4

// ─────────────────────────────────────────────────────────────────────────────
// Which SynthDef categories map to which browser section
// ─────────────────────────────────────────────────────────────────────────────

/** Electronic/synthetic — shows in "Sounds" */
export const SOUNDS_SYNTH_CATEGORIES = new Set([
    "Basic", "Synth", "Bass", "Lead", "Pad", "Keys",
]);

/** Acoustic emulations / GM instruments — shows in "Instruments" */
export const INSTRUMENTS_SYNTH_CATEGORIES = new Set([
    "Piano", "Chromatic Percussion", "Organ", "Guitar",
    "Strings", "Ensemble", "Brass",
]);

/** Drum machines and world percussion — shows in "Drums" */
export const DRUMS_SYNTH_CATEGORIES = new Set([
    "Drums", "Percussion",
]);
