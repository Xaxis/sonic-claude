/**
 * midiClipUtils - Shared utilities for the MIDI clip controls panel
 *
 * Mirrors sampleEditorUtils.ts — safe defaults for MIDI transform fields
 * so MidiClipControls never has to handle undefined/null defensively inline.
 */

import type { SequencerClip } from "../../types";

/** Normalises all MIDI transform clip fields to sensible defaults. */
export function safeMidiClipDefaults(clip: Partial<SequencerClip>) {
    return {
        midiTranspose:         clip.midi_transpose          ?? 0,
        midiVelocityOffset:    clip.midi_velocity_offset    ?? 0,
        midiGate:              clip.midi_gate               ?? 1.0,
        midiTimingOffset:      clip.midi_timing_offset      ?? 0,
        midiQuantizeStrength:  clip.midi_quantize_strength  ?? 0,
    };
}
