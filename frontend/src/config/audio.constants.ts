/**
 * Audio Constants
 *
 * Centralized audio, MIDI, and sample-editing parameter ranges.
 * Import from here instead of scattering magic numbers across components.
 */

// ============================================================================
// MIDI
// ============================================================================

export const MIDI_NOTE_MIN = 0;
export const MIDI_NOTE_MAX = 127;
export const MIDI_VELOCITY_MAX = 127;

/** A4 reference frequency in Hz */
export const A4_FREQUENCY = 440;

/** MIDI note number for A4 */
export const A4_MIDI_NOTE = 69;

/** Semitones per octave */
export const SEMITONES_PER_OCTAVE = 12;

// ============================================================================
// VOLUME / GAIN (dB)
// ============================================================================

/** Minimum channel/master volume in dB */
export const VOLUME_MIN_DB = -60;

/** Maximum channel/master volume in dB */
export const VOLUME_MAX_DB = 12;

/** Amplitude floor used for log-scale calculations */
export const VOLUME_AMPLITUDE_FLOOR_DB = -96;

// ============================================================================
// SAMPLE EDITING RANGES
// ============================================================================

/** Minimum pitch shift in semitones */
export const SAMPLE_PITCH_SEMITONES_MIN = -24;

/** Maximum pitch shift in semitones */
export const SAMPLE_PITCH_SEMITONES_MAX = 24;

/** Step size for pitch slider */
export const SAMPLE_PITCH_SEMITONES_STEP = 0.5;

/** Minimum playback rate multiplier */
export const SAMPLE_RATE_MIN = 0.25;

/** Maximum playback rate multiplier */
export const SAMPLE_RATE_MAX = 4.0;

/** Step size for rate slider */
export const SAMPLE_RATE_STEP = 0.05;

/** Maximum gain multiplier (2.0 = +6 dB) */
export const SAMPLE_GAIN_MAX = 2.0;

/** Step size for gain slider */
export const SAMPLE_GAIN_STEP = 0.01;

/** Maximum fade in/out duration in seconds */
export const SAMPLE_FADE_MAX_SECONDS = 5.0;

/** Step size for fade sliders */
export const SAMPLE_FADE_STEP = 0.05;
