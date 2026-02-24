/**
 * Input Feature Types
 *
 * Type definitions for the inputs module.
 * Manages audio input, MIDI input, and sample library functionality.
 */

// Re-export types from hooks for convenience
export type { AudioDeviceInfo } from "./hooks/useAudioInput";
export type { MidiDeviceInfo } from "./hooks/useMidiInput";

/**
 * Input tab types
 */
export type InputTab = "audio" | "midi" | "library";

/**
 * Sample categories
 */
export const SAMPLE_CATEGORIES = [
    "All",
    "Uncategorized",
    "Drums",
    "Bass",
    "Synth",
    "Vocals",
    "FX",
    "Loops",
    "Recordings",
] as const;

export type SampleCategory = typeof SAMPLE_CATEGORIES[number];