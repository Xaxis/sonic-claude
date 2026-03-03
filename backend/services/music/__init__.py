"""
Music Theory & Knowledge Library

Pure Python music knowledge — no LLM, no side effects.
The AI specifies music symbolically; this library converts to MIDI.
"""

from .theory import (
    note_name_to_midi,
    midi_to_note_name,
    get_scale_notes,
    get_chord_notes,
    parse_chord_symbol,
    chord_progression_to_notes,
    scale_melody_to_notes,
    SCALES,
    CHORD_INTERVALS,
)
from .patterns import (
    GM_DRUM_MAP,
    voice_to_midi_note,
    get_genre_pattern,
    generate_drum_notes_from_pattern,
    get_available_genres as get_pattern_genres,
)
from .genre_profiles import (
    GENRE_PROFILES,
    get_genre_profile,
    detect_genre,
    get_available_genres,
    get_genre_kit_catalog_for_ai,
)

__all__ = [
    # Theory
    "note_name_to_midi",
    "midi_to_note_name",
    "get_scale_notes",
    "get_chord_notes",
    "parse_chord_symbol",
    "chord_progression_to_notes",
    "scale_melody_to_notes",
    "SCALES",
    "CHORD_INTERVALS",
    # Patterns
    "GM_DRUM_MAP",
    "voice_to_midi_note",
    "get_genre_pattern",
    "generate_drum_notes_from_pattern",
    # Genre
    "GENRE_PROFILES",
    "get_genre_profile",
    "detect_genre",
    "get_available_genres",
    "get_genre_kit_catalog_for_ai",
]
