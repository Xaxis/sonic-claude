/**
 * Audio Utilities
 *
 * Shared utility functions for audio calculations and conversions
 * Used across mixer, sequencer, and other audio modules
 */

/**
 * Convert linear volume (0.0-2.0) to decibels
 * @param volume Linear volume value (1.0 = unity gain)
 * @returns Volume in dB (-60 to +12)
 */
export function volumeToDb(volume: number): number {
    if (volume === 0) return -60;
    return 20 * Math.log10(volume);
}

/**
 * Convert decibels to linear volume (0.0-2.0)
 * @param db Volume in dB
 * @returns Linear volume value (1.0 = unity gain)
 */
export function dbToVolume(db: number): number {
    if (db <= -60) return 0;
    return Math.pow(10, db / 20);
}

/**
 * Convert linear amplitude (0.0-1.0) to decibels
 * @param amplitude Linear amplitude value
 * @returns Amplitude in dB (-96 to 0)
 */
export function amplitudeToDb(amplitude: number): number {
    if (amplitude === 0) return -96;
    return 20 * Math.log10(amplitude);
}

/**
 * Convert decibels to linear amplitude (0.0-1.0)
 * @param db Amplitude in dB
 * @returns Linear amplitude value
 */
export function dbToAmplitude(db: number): number {
    if (db <= -96) return 0;
    return Math.pow(10, db / 20);
}

/**
 * Convert MIDI note number to frequency in Hz
 * @param note MIDI note number (0-127)
 * @returns Frequency in Hz
 */
export function midiNoteToFrequency(note: number): number {
    return 440.0 * Math.pow(2, (note - 69) / 12);
}

/**
 * Convert frequency in Hz to MIDI note number
 * @param frequency Frequency in Hz
 * @returns MIDI note number (can be fractional)
 */
export function frequencyToMidiNote(frequency: number): number {
    return 69 + 12 * Math.log2(frequency / 440.0);
}

/**
 * Convert MIDI velocity (0-127) to linear amplitude (0.0-1.0)
 * @param velocity MIDI velocity value
 * @param curve Velocity curve (1.0 = linear, <1.0 = soft, >1.0 = hard)
 * @returns Linear amplitude value
 */
export function velocityToAmplitude(velocity: number, curve: number = 1.0): number {
    const normalized = velocity / 127.0;
    return Math.pow(normalized, curve);
}

/**
 * Clamp a value between min and max
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0.0-1.0)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Format dB value for display
 * @param db Value in dB
 * @param precision Number of decimal places
 * @returns Formatted string (e.g., "+3.2 dB", "-12.0 dB", "-∞")
 */
export function formatDb(db: number, precision: number = 1): string {
    if (db <= -96) return "-∞";
    const sign = db > 0 ? "+" : "";
    return `${sign}${db.toFixed(precision)}`;
}

/**
 * Format pan value for display
 * @param pan Pan value (-1.0 to 1.0)
 * @returns Formatted string (e.g., "C", "L50", "R75")
 */
export function formatPan(pan: number): string {
    if (Math.abs(pan) < 0.01) return "C";
    return pan < 0
        ? `L${Math.abs(pan * 100).toFixed(0)}`
        : `R${(pan * 100).toFixed(0)}`;
}

/**
 * Format percentage value for display
 * @param value Value (0.0-1.0)
 * @param precision Number of decimal places
 * @returns Formatted string (e.g., "75%")
 */
export function formatPercent(value: number, precision: number = 0): string {
    return `${(value * 100).toFixed(precision)}%`;
}

