/**
 * DAW Constants
 *
 * Centralized sequencer/timeline/piano-roll constants.
 * Import from here instead of defining locally in components.
 */

// ============================================================================
// SEQUENCER LAYOUT
// ============================================================================

/** Width (px) of the fixed left column (keyboard / controls sidebar) — shared across all sequencer views */
export const SEQUENCER_SIDEBAR_WIDTH = 256;

// ============================================================================
// PIANO ROLL
// ============================================================================

/** Lowest piano-roll pitch displayed (MIDI note 21 = A0) */
export const PIANO_ROLL_MIN_PITCH = 21;

/** Highest piano-roll pitch displayed (MIDI note 108 = C8) */
export const PIANO_ROLL_MAX_PITCH = 108;

/** Height (px) of each note row in the piano roll */
export const PIANO_ROLL_NOTE_HEIGHT = 20;

/**
 * Which note indices within an octave (0-11) are black keys.
 * C#=1, D#=3, F#=6, G#=8, A#=10
 */
export const PIANO_ROLL_BLACK_KEY_OFFSETS: readonly number[] = [1, 3, 6, 8, 10];

// ============================================================================
// TIMELINE
// ============================================================================

/** Pixels per beat at zoom = 1.0 */
export const TIMELINE_PIXELS_PER_BEAT = 40;

/** Beats per measure (4/4 time) */
export const TIMELINE_BEATS_PER_MEASURE = 4;

/** Minimum visible timeline length in beats (= 16 measures) */
export const TIMELINE_MIN_BEATS = 64;

/** Padding beats added after the last clip end (= 32 measures) */
export const TIMELINE_PADDING_BEATS = 128;

// ============================================================================
// DEFAULTS
// ============================================================================

/** Default composition tempo when none is loaded */
export const DEFAULT_TEMPO_BPM = 120;
