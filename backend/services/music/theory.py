"""
Music Theory Primitives

Deterministic music knowledge as Python code.
The AI specifies music symbolically (note names, chord symbols, scale names).
This module converts to MIDI numbers — no hallucination, no LLM needed.

Design: All public functions are pure (no side effects, no I/O).
"""

from typing import List, Dict, Optional, Tuple


# ── Note name → chromatic offset (C=0) ──────────────────────────────────────

_NOTE_OFFSETS: Dict[str, int] = {
    "C": 0, "B#": 0,
    "C#": 1, "Db": 1,
    "D": 2,
    "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4,
    "F": 5, "E#": 5,
    "F#": 6, "Gb": 6,
    "G": 7,
    "G#": 8, "Ab": 8,
    "A": 9,
    "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11,
}

_MIDI_TO_NOTE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


# ── Scale interval patterns (semitones from root) ────────────────────────────

SCALES: Dict[str, List[int]] = {
    # Major modes
    "major":           [0, 2, 4, 5, 7, 9, 11],
    "dorian":          [0, 2, 3, 5, 7, 9, 10],
    "phrygian":        [0, 1, 3, 5, 7, 8, 10],
    "lydian":          [0, 2, 4, 6, 7, 9, 11],
    "mixolydian":      [0, 2, 4, 5, 7, 9, 10],
    "aeolian":         [0, 2, 3, 5, 7, 8, 10],   # natural minor
    "locrian":         [0, 1, 3, 5, 6, 8, 10],

    # Minor aliases
    "minor":           [0, 2, 3, 5, 7, 8, 10],   # = aeolian
    "natural_minor":   [0, 2, 3, 5, 7, 8, 10],
    "harmonic_minor":  [0, 2, 3, 5, 7, 8, 11],
    "melodic_minor":   [0, 2, 3, 5, 7, 9, 11],

    # Pentatonic
    "pentatonic_major": [0, 2, 4, 7, 9],
    "pentatonic_minor": [0, 3, 5, 7, 10],

    # Blues
    "blues":           [0, 3, 5, 6, 7, 10],
    "blues_major":     [0, 2, 3, 4, 7, 9],

    # Symmetric
    "whole_tone":      [0, 2, 4, 6, 8, 10],
    "diminished":      [0, 2, 3, 5, 6, 8, 9, 11],   # half-whole
    "chromatic":       list(range(12)),
}

# Common aliases
SCALES["ionian"] = SCALES["major"]


# ── Chord interval tables (semitones from root) ───────────────────────────────

CHORD_INTERVALS: Dict[str, List[int]] = {
    # Triads
    "maj":   [0, 4, 7],
    "min":   [0, 3, 7],
    "dim":   [0, 3, 6],
    "aug":   [0, 4, 8],
    "sus2":  [0, 2, 7],
    "sus4":  [0, 5, 7],

    # 7ths
    "maj7":      [0, 4, 7, 11],
    "min7":      [0, 3, 7, 10],
    "dom7":      [0, 4, 7, 10],
    "7":         [0, 4, 7, 10],
    "dim7":      [0, 3, 6, 9],
    "hdim7":     [0, 3, 6, 10],   # half-diminished
    "minmaj7":   [0, 3, 7, 11],
    "augmaj7":   [0, 4, 8, 11],
    "aug7":      [0, 4, 8, 10],

    # 6ths
    "6":     [0, 4, 7, 9],
    "min6":  [0, 3, 7, 9],

    # 9ths
    "maj9":  [0, 4, 7, 11, 14],
    "min9":  [0, 3, 7, 10, 14],
    "dom9":  [0, 4, 7, 10, 14],
    "9":     [0, 4, 7, 10, 14],
    "add9":  [0, 4, 7, 14],
    "madd9": [0, 3, 7, 14],

    # 11ths / 13ths
    "11":    [0, 4, 7, 10, 14, 17],
    "min11": [0, 3, 7, 10, 14, 17],
    "13":    [0, 4, 7, 10, 14, 17, 21],
}

# Chord symbol parsing aliases
_CHORD_QUALITY_ALIASES: Dict[str, str] = {
    "M":     "maj",
    "m":     "min",
    "-":     "min",
    "°":     "dim",
    "ø":     "hdim7",
    "+":     "aug",
    "Δ":     "maj7",
    "△":     "maj7",
    "△7":    "maj7",
    "M7":    "maj7",
    "m7":    "min7",
    "-7":    "min7",
    "dom7":  "dom7",
    "7":     "dom7",
}


# ────────────────────────────────────────────────────────────────────────────
# Public API
# ────────────────────────────────────────────────────────────────────────────

def note_name_to_midi(name: str) -> int:
    """
    Convert a note name string to a MIDI note number.

    Examples:
        "C4"  → 60
        "A3"  → 57
        "F#5" → 78
        "Bb2" → 46
        "Eb4" → 63

    Middle C is C4 = MIDI 60 (standard convention).
    """
    name = name.strip()
    if not name:
        raise ValueError("Empty note name")

    # Parse note name (1-2 chars) + octave (1 digit, possibly negative)
    i = 0
    note_str = name[0].upper()
    i += 1
    if i < len(name) and name[i] in "#b":
        note_str += name[i]
        i += 1
    octave_str = name[i:]
    if not octave_str and octave_str != "0":
        raise ValueError(f"Cannot parse octave from note name: {name!r}")
    try:
        octave = int(octave_str)
    except ValueError:
        raise ValueError(f"Cannot parse note name: {name!r}")

    if note_str not in _NOTE_OFFSETS:
        raise ValueError(f"Unknown note name: {note_str!r}")

    return 12 * (octave + 1) + _NOTE_OFFSETS[note_str]


def midi_to_note_name(midi: int, prefer_sharps: bool = True) -> str:
    """Convert MIDI note number to a note name string. E.g., 60 → 'C4'."""
    octave = (midi // 12) - 1
    degree = midi % 12
    note = _MIDI_TO_NOTE[degree]
    if not prefer_sharps and "#" in note:
        # Return flat equivalent where it exists
        flat_map = {"C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb"}
        note = flat_map.get(note, note)
    return f"{note}{octave}"


def get_scale_notes(root: str, scale: str, octave: int = 4, num_octaves: int = 1) -> List[int]:
    """
    Return MIDI note numbers for all notes in a scale.

    Args:
        root: Root note name ("C", "A", "F#", "Bb")
        scale: Scale name ("major", "minor", "pentatonic_minor", ...)
        octave: Starting octave (default 4)
        num_octaves: How many octaves to span (default 1)

    Returns:
        List of MIDI note numbers in ascending order.
    """
    scale_key = scale.lower().replace(" ", "_")
    if scale_key not in SCALES:
        raise ValueError(f"Unknown scale: {scale!r}. Available: {sorted(SCALES)}")

    # Root MIDI note at requested octave
    root_midi = note_name_to_midi(f"{root}{octave}")
    intervals = SCALES[scale_key]

    notes = []
    for oct_offset in range(num_octaves):
        for interval in intervals:
            n = root_midi + oct_offset * 12 + interval
            if 0 <= n <= 127:
                notes.append(n)

    return notes


def parse_chord_symbol(symbol: str) -> Tuple[str, str]:
    """
    Parse a chord symbol into (root_note, quality).

    Examples:
        "Am7"  → ("A", "min7")
        "Cmaj7"→ ("C", "maj7")
        "G7"   → ("G", "dom7")
        "Dm"   → ("D", "min")
        "F#m"  → ("F#", "min")
        "Bbmaj9" → ("Bb", "maj9")
    """
    symbol = symbol.strip()

    # Extract root note (1-2 chars)
    root = symbol[0].upper()
    rest = symbol[1:]
    if rest and rest[0] in "#b":
        root += rest[0]
        rest = rest[1:]

    # Normalize quality
    quality = rest if rest else "maj"

    # Apply known aliases
    if quality in _CHORD_QUALITY_ALIASES:
        quality = _CHORD_QUALITY_ALIASES[quality]

    # Normalize common suffixes
    quality_lower = quality.lower()
    if quality_lower == "":
        quality = "maj"
    elif quality_lower in ("m", "min", "-"):
        quality = "min"
    elif quality_lower in ("maj7", "m7", "△7"):
        quality = "maj7"
    elif quality_lower in ("m7", "min7", "-7"):
        quality = "min7"
    elif quality_lower in ("7",):
        quality = "dom7"

    # If quality not in table, try lowercase lookup
    if quality not in CHORD_INTERVALS:
        lower = quality.lower()
        if lower in CHORD_INTERVALS:
            quality = lower
        else:
            # Default to major triad
            quality = "maj"

    return root, quality


def get_chord_notes(symbol: str, octave: int = 4, voicing: str = "closed") -> List[int]:
    """
    Return MIDI note numbers for a chord symbol.

    Args:
        symbol: Chord symbol, e.g. "Am7", "Cmaj7", "G7", "F#m", "Bb"
        octave: Base octave for the root note (default 4)
        voicing: "closed" (all within 1 octave), "open" (spread across 2),
                 "spread" (wider spacing for pads/strings)

    Returns:
        List of MIDI note numbers.

    Examples:
        get_chord_notes("Am", 3)      → [57, 60, 64]
        get_chord_notes("Cmaj7", 4)   → [60, 64, 67, 71]
    """
    root, quality = parse_chord_symbol(symbol)
    intervals = CHORD_INTERVALS.get(quality, CHORD_INTERVALS["maj"])

    root_midi = note_name_to_midi(f"{root}{octave}")
    notes = [root_midi + i for i in intervals]

    # Clip to valid MIDI range
    notes = [n for n in notes if 0 <= n <= 127]

    if voicing == "open" and len(notes) >= 3:
        # Raise 3rd by an octave for an open voicing (root - 5th - 3rd - 7th)
        notes = [notes[0], notes[2], notes[1] + 12] + notes[3:]
    elif voicing == "spread" and len(notes) >= 3:
        # Spread: root, 5th, 10th, 14th … (stack in wider intervals)
        notes = [notes[0], notes[0] + intervals[-1] if len(intervals) > 1 else notes[-1],
                 notes[1] + 12, notes[2] + 12] + [n + 12 for n in notes[3:]]
        notes = sorted(set(n for n in notes if 0 <= n <= 127))

    return sorted(notes)


def chord_progression_to_notes(
    chords: List[str],
    octave: int = 4,
    voicing: str = "closed",
    beats_per_chord: float = 4.0,
    velocity: int = 80,
    strum_delay: float = 0.0,
) -> List[Dict]:
    """
    Convert a chord progression to a list of compact MIDI note dicts.

    Returns list of {n, s, d, v} compact dicts ready for clip creation.

    Args:
        chords: List of chord symbols ["Am", "F", "C", "G"]
        octave: Base octave for chord voicings
        voicing: "closed" / "open" / "spread"
        beats_per_chord: Duration of each chord in beats
        velocity: Note velocity (0–127)
        strum_delay: Seconds between chord notes (0 = simultaneous)
    """
    events = []
    for i, chord_symbol in enumerate(chords):
        beat_start = i * beats_per_chord
        notes = get_chord_notes(chord_symbol, octave=octave, voicing=voicing)
        for j, midi_note in enumerate(notes):
            events.append({
                "n": midi_note,
                "s": beat_start + j * strum_delay,
                "d": beats_per_chord,
                "v": velocity,
            })
    return events


def scale_melody_to_notes(
    pitches: List[str],
    beats: List[float],
    durations: List[float],
    velocities: Optional[List[int]] = None,
) -> List[Dict]:
    """
    Convert lists of note names / beats / durations to compact MIDI dicts.

    Args:
        pitches: Note names ["A4", "C5", "G4", ...]
        beats: Start beats [0.0, 0.5, 1.0, ...]
        durations: Duration in beats [0.5, 0.5, 1.0, ...]
        velocities: Optional per-note velocities (defaults to 100)
    """
    if velocities is None:
        velocities = [100] * len(pitches)

    return [
        {
            "n": note_name_to_midi(p),
            "s": b,
            "d": d,
            "v": v,
        }
        for p, b, d, v in zip(pitches, beats, durations, velocities)
    ]


def get_available_scales() -> List[str]:
    """Return sorted list of all available scale names."""
    return sorted(SCALES.keys())


def get_available_chord_qualities() -> List[str]:
    """Return sorted list of all available chord quality names."""
    return sorted(CHORD_INTERVALS.keys())
