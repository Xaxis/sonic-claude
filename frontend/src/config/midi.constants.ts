/**
 * MIDI Constants
 *
 * Shared MIDI utilities — note names, GM drum map, and helper functions.
 * Import from here instead of redefining locally in components.
 */

// ============================================================================
// NOTE NAMES
// ============================================================================

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Convert a MIDI note number to a human-readable name (e.g. 60 → "C4") */
export function midiNoteToName(note: number): string {
    const octave = Math.floor(note / 12) - 1;
    return `${NOTE_NAMES[note % 12]}${octave}`;
}

// ============================================================================
// GM STANDARD DRUM MAP (Channel 10, MIDI notes 35–81)
// ============================================================================

export const GM_DRUM_NAMES: Record<number, string> = {
    35: "Kick 2",
    36: "Kick",
    37: "Side Stick",
    38: "Snare",
    39: "Clap",
    40: "Snare Tight",
    41: "Floor Tom Lo",
    42: "Hi-Hat",
    43: "Floor Tom Hi",
    44: "Pedal HH",
    45: "Tom Lo",
    46: "Open HH",
    47: "Tom Mid-Lo",
    48: "Tom Mid-Hi",
    49: "Crash",
    50: "Tom Hi",
    51: "Ride",
    52: "China",
    53: "Ride Bell",
    54: "Tambourine",
    55: "Splash",
    56: "Cowbell",
    57: "Crash 2",
    58: "Vibraslap",
    59: "Ride 2",
    60: "Bongo Hi",
    61: "Bongo Lo",
    62: "Conga Hi Mute",
    63: "Conga Hi",
    64: "Conga Lo",
    65: "Timbale Hi",
    66: "Timbale Lo",
    67: "Agogo Hi",
    68: "Agogo Lo",
    69: "Cabasa",
    70: "Maracas",
    71: "Whistle Hi",
    72: "Whistle Lo",
    73: "Guiro Short",
    74: "Guiro Long",
    75: "Claves",
    76: "Wood Block Hi",
    77: "Wood Block Lo",
    78: "Cuica Mute",
    79: "Cuica Open",
    80: "Triangle Mute",
    81: "Triangle Open",
};
