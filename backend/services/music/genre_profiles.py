"""
Genre Profiles — musical characteristics per genre.

Provides: tempo ranges, recommended kits, scales, chord progressions,
          bass styles, instrument suggestions, and structural conventions.

Used by the AI to make informed musical decisions without needing to encode
genre knowledge in the LLM prompt.
"""

from typing import Dict, List, Optional, Tuple


# ── Genre profile schema ─────────────────────────────────────────────────────
#
# Each profile contains:
#   tempo_range:  (min_bpm, max_bpm) — typical tempo range
#   tempo_default: suggested default BPM
#   kit_id:       primary drum kit from registry
#   scales:       list of scale names (first = most characteristic)
#   progressions: list of common chord progressions (as chord symbol lists)
#   bass_octave:  typical bass octave
#   bass_style:   description of bass role ("sub_808", "walking", "driving", ...)
#   chord_instrument: typical chord instrument synthdef name
#   lead_instrument:  typical lead/melody synthdef name
#   chord_voicing: "closed" / "open" / "spread"
#   structure_bars: typical section length in bars
#   notes:         free-form genre description for AI context

GENRE_PROFILES: Dict[str, Dict] = {

    "trap": {
        "tempo_range":      (130, 175),
        "tempo_default":    140,
        "kit_id":           "trap-kit",
        "scales":           ["pentatonic_minor", "minor", "blues"],
        "progressions":     [
            ["Am", "Am", "F", "G"],
            ["Cm", "Cm", "Ab", "Bb"],
            ["Gm", "Gm", "Eb", "F"],
            ["Dm", "Dm", "Bb", "C"],
        ],
        "bass_octave":      2,
        "bass_style":       "sub_808",
        "chord_instrument": "pad",
        "lead_instrument":  "lead",
        "chord_voicing":    "open",
        "structure_bars":   8,
        "chord_rhythm":     "off_beat",
        "arp_style":        "up",
        "arp_rhythm":       "16th",
        "melody_contour":   "arch",
        "melody_density":   "sparse",
        "bass_generator":   "sub_pulse",
        "bass_instrument":  "bass",
        "notes": "Heavy sub-bass 808, sparse minor keys, dark atmospheric pads, gliding 808 basslines.",
    },

    "house": {
        "tempo_range":      (120, 135),
        "tempo_default":    126,
        "kit_id":           "house-kit",
        "scales":           ["minor", "dorian", "major"],
        "progressions":     [
            ["Am", "Am", "Dm", "Dm"],
            ["Fm", "Fm", "Cm", "Cm"],
            ["Gm", "Gm", "Eb", "Bb"],
            ["Am7", "Dm7", "G7", "Cmaj7"],
        ],
        "bass_octave":      2,
        "bass_style":       "pumping",
        "chord_instrument": "pad",
        "lead_instrument":  "organ",
        "chord_voicing":    "open",
        "structure_bars":   8,
        "chord_rhythm":     "on_beat",
        "arp_style":        "up",
        "arp_rhythm":       "8th",
        "melody_contour":   "arch",
        "melody_density":   "medium",
        "bass_generator":   "root_pulse",
        "bass_instrument":  "bass",
        "notes": "4-on-the-floor kick, sidechain compression feel, soulful chord stabs, deep bass.",
    },

    "techno": {
        "tempo_range":      (130, 150),
        "tempo_default":    138,
        "kit_id":           "techno-kit",
        "scales":           ["minor", "phrygian", "blues"],
        "progressions":     [
            ["Am", "Am", "Am", "Am"],
            ["Fm", "Fm", "Gb", "Fm"],
        ],
        "bass_octave":      2,
        "bass_style":       "reese",
        "chord_instrument": "pad",
        "lead_instrument":  "fm",
        "chord_voicing":    "open",
        "structure_bars":   8,
        "chord_rhythm":     "block",
        "arp_style":        "up",
        "arp_rhythm":       "16th",
        "melody_contour":   "wave",
        "melody_density":   "sparse",
        "bass_generator":   "root_pulse",
        "bass_instrument":  "reese",
        "notes": "Pounding kick, mechanical, minimal chord movement, industrial textures.",
    },

    "dnb": {
        "tempo_range":      (165, 180),
        "tempo_default":    174,
        "kit_id":           "dnb-kit",
        "scales":           ["minor", "pentatonic_minor"],
        "progressions":     [
            ["Am", "Am", "F", "G"],
            ["Dm", "Dm", "Bb", "C"],
        ],
        "bass_octave":      2,
        "bass_style":       "reese",
        "chord_instrument": "pad",
        "lead_instrument":  "lead",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "block",
        "arp_style":        "up_down",
        "arp_rhythm":       "16th",
        "melody_contour":   "wave",
        "melody_density":   "dense",
        "bass_generator":   "syncopated",
        "bass_instrument":  "reese",
        "notes": "Fast breakbeats, heavy Reese bass, atmospheric pads, high-energy drops.",
    },

    "boom_bap": {
        "tempo_range":      (80, 100),
        "tempo_default":    90,
        "kit_id":           "boom-bap",
        "scales":           ["pentatonic_minor", "blues", "minor"],
        "progressions":     [
            ["Cm7", "Fm7", "Bb7", "Ebmaj7"],
            ["Am7", "Dm7", "G7", "Cmaj7"],
            ["Dm7", "G7", "Cmaj7", "A7"],
        ],
        "bass_octave":      2,
        "bass_style":       "walking",
        "chord_instrument": "electricPiano1",
        "lead_instrument":  "brass",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "syncopated",
        "arp_style":        "up",
        "arp_rhythm":       "swing_8th",
        "melody_contour":   "arch",
        "melody_density":   "medium",
        "bass_generator":   "walking",
        "bass_instrument":  "electricBassFinger",
        "notes": "Classic hip-hop, swung 8th notes, jazz-influenced chords, warm samples.",
    },

    "lofi": {
        "tempo_range":      (70, 95),
        "tempo_default":    80,
        "kit_id":           "lofi-kit",
        "scales":           ["pentatonic_major", "major", "dorian"],
        "progressions":     [
            ["Cmaj7", "Am7", "Fmaj7", "G7"],
            ["Fmaj7", "Em7", "Am7", "Dm7"],
            ["Ebmaj7", "Cm7", "Fm7", "Bb7"],
        ],
        "bass_octave":      2,
        "bass_style":       "simple",
        "chord_instrument": "electricPiano1",
        "lead_instrument":  "flute",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "block",
        "arp_style":        "up",
        "arp_rhythm":       "dotted_8th",
        "melody_contour":   "arch",
        "melody_density":   "sparse",
        "bass_generator":   "root_only",
        "bass_instrument":  "electricBassFinger",
        "notes": "Nostalgic, chill, warm chord voicings, gentle dynamics, dusty drum feel.",
    },

    "hip_hop": {
        "tempo_range":      (85, 105),
        "tempo_default":    95,
        "kit_id":           "boom-bap",
        "scales":           ["pentatonic_minor", "minor", "blues"],
        "progressions":     [
            ["Am7", "Dm7", "G7", "Cmaj7"],
            ["Gm7", "Cm7", "F7", "Bbmaj7"],
        ],
        "bass_octave":      2,
        "bass_style":       "sub_808",
        "chord_instrument": "pad",
        "lead_instrument":  "lead",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "off_beat",
        "arp_style":        "up",
        "arp_rhythm":       "8th",
        "melody_contour":   "falling",
        "melody_density":   "sparse",
        "bass_generator":   "syncopated",
        "bass_instrument":  "synthBass1",
        "notes": "Classic hip-hop groove, sampling culture feel, soulful chords.",
    },

    "afrobeats": {
        "tempo_range":      (95, 115),
        "tempo_default":    105,
        "kit_id":           "afrobeats",
        "scales":           ["major", "pentatonic_major"],
        "progressions":     [
            ["Cmaj7", "Am7", "Fmaj7", "G7"],
            ["Ebmaj7", "Cm7", "Fm7", "Bb7"],
        ],
        "bass_octave":      2,
        "bass_style":       "driving",
        "chord_instrument": "electricPiano1",
        "lead_instrument":  "lead",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "syncopated",
        "arp_style":        "up",
        "arp_rhythm":       "8th",
        "melody_contour":   "wave",
        "melody_density":   "medium",
        "bass_generator":   "syncopated",
        "bass_instrument":  "electricBassFinger",
        "notes": "Infectious groove, syncopated rhythms, warm guitar-inspired chords.",
    },

    "uk_garage": {
        "tempo_range":      (128, 140),
        "tempo_default":    135,
        "kit_id":           "uk-garage",
        "scales":           ["minor", "dorian"],
        "progressions":     [
            ["Am", "Dm", "G", "C"],
            ["Fm", "Cm", "Bb", "Eb"],
        ],
        "bass_octave":      2,
        "bass_style":       "punchy",
        "chord_instrument": "pad",
        "lead_instrument":  "lead",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "syncopated",
        "arp_style":        "up_down",
        "arp_rhythm":       "8th",
        "melody_contour":   "arch",
        "melody_density":   "medium",
        "bass_generator":   "syncopated",
        "bass_instrument":  "synthBass1",
        "notes": "2-step rhythms, swung 16ths, soulful vocals implied, punchy bass.",
    },

    "jazz": {
        "tempo_range":      (80, 180),
        "tempo_default":    120,
        "kit_id":           "jazz-kit",
        "scales":           ["major", "dorian", "mixolydian", "blues"],
        "progressions":     [
            ["Cmaj7", "Am7", "Dm7", "G7"],
            ["Dm7", "G7", "Cmaj7", "A7"],
            ["Am7", "D7", "Gmaj7", "Cmaj7"],
            ["Fm7", "Bb7", "Ebmaj7", "Cm7"],
        ],
        "bass_octave":      2,
        "bass_style":       "walking",
        "chord_instrument": "acousticGrandPiano",
        "lead_instrument":  "trumpet",
        "chord_voicing":    "open",
        "structure_bars":   8,
        "chord_rhythm":     "block",
        "arp_style":        "up",
        "arp_rhythm":       "swing_8th",
        "melody_contour":   "wave",
        "melody_density":   "medium",
        "bass_generator":   "walking",
        "bass_instrument":  "acousticBass",
        "notes": "Extended chords (7ths/9ths), swing feel, II-V-I progressions, walking bass.",
    },

    "funk": {
        "tempo_range":      (100, 130),
        "tempo_default":    110,
        "kit_id":           "funk-kit",
        "scales":           ["minor", "pentatonic_minor", "dorian"],
        "progressions":     [
            ["Dm7", "G7", "Dm7", "G7"],
            ["Am7", "D7", "Am7", "D7"],
            ["Gm7", "C7", "Gm7", "C7"],
        ],
        "bass_octave":      2,
        "bass_style":       "slap",
        "chord_instrument": "clavinet",
        "lead_instrument":  "brass",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "syncopated",
        "arp_style":        "up",
        "arp_rhythm":       "16th",
        "melody_contour":   "wave",
        "melody_density":   "dense",
        "bass_generator":   "syncopated",
        "bass_instrument":  "slapBass1",
        "notes": "16th-note syncopation, tight stabs, heavy groove, call-and-response.",
    },

    "rock": {
        "tempo_range":      (110, 140),
        "tempo_default":    120,
        "kit_id":           "rock-kit",
        "scales":           ["pentatonic_minor", "minor", "major"],
        "progressions":     [
            ["G", "D", "Am", "C"],
            ["A", "E", "F#m", "D"],
            ["Em", "C", "G", "D"],
        ],
        "bass_octave":      2,
        "bass_style":       "driving",
        "chord_instrument": "supersaw",
        "lead_instrument":  "lead",
        "chord_voicing":    "closed",
        "structure_bars":   8,
        "chord_rhythm":     "block",
        "arp_style":        "up",
        "arp_rhythm":       "8th",
        "melody_contour":   "rising",
        "melody_density":   "medium",
        "bass_generator":   "root_pulse",
        "bass_instrument":  "electricBassPick",
        "notes": "Straight-ahead rock beat, power chords, pentatonic leads.",
    },

    "ambient": {
        "tempo_range":      (60, 100),
        "tempo_default":    80,
        "kit_id":           "ambient-kit",
        "scales":           ["major", "lydian", "whole_tone"],
        "progressions":     [
            ["Cmaj7", "Gmaj7", "Fmaj7", "Amaj7"],
            ["Fmaj7", "Cmaj7", "Gmaj7", "Amaj7"],
        ],
        "bass_octave":      2,
        "bass_style":       "drone",
        "chord_instrument": "pad",
        "lead_instrument":  "bell",
        "chord_voicing":    "spread",
        "structure_bars":   16,
        "chord_rhythm":     "block",
        "arp_style":        "up",
        "arp_rhythm":       "dotted_8th",
        "melody_contour":   "arch",
        "melody_density":   "sparse",
        "bass_generator":   "root_only",
        "bass_instrument":  "bass",
        "notes": "Slow evolving textures, lush pads, sparse percussion, reverb-drenched.",
    },

    "r_and_b": {
        "tempo_range":      (60, 95),
        "tempo_default":    80,
        "kit_id":           "boom-bap",
        "scales":           ["pentatonic_minor", "minor", "dorian"],
        "progressions":     [
            ["Dm7", "Am7", "Gm7", "A7"],
            ["Cm7", "Fm7", "Bb7", "Ebmaj7"],
        ],
        "bass_octave":      2,
        "bass_style":       "smooth",
        "chord_instrument": "electricPiano1",
        "lead_instrument":  "pad",
        "chord_voicing":    "open",
        "structure_bars":   8,
        "chord_rhythm":     "off_beat",
        "arp_style":        "up",
        "arp_rhythm":       "dotted_8th",
        "melody_contour":   "arch",
        "melody_density":   "medium",
        "bass_generator":   "syncopated",
        "bass_instrument":  "electricBassFinger",
        "notes": "Silky smooth, soulful chords, lush harmonics, understated groove.",
    },
}

# Genre name aliases
_GENRE_ALIASES: Dict[str, str] = {
    "trap_music":      "trap",
    "drill":           "trap",
    "hiphop":          "hip_hop",
    "hip-hop":         "hip_hop",
    "boom bap":        "boom_bap",
    "lofi hiphop":     "lofi",
    "lo-fi":           "lofi",
    "lo fi":           "lofi",
    "chill":           "lofi",
    "deep house":      "house",
    "edm":             "house",
    "drum and bass":   "dnb",
    "jungle":          "dnb",
    "garage":          "uk_garage",
    "2step":           "uk_garage",
    "afro":            "afrobeats",
    "afropop":         "afrobeats",
    "rnb":             "r_and_b",
    "r&b":             "r_and_b",
    "soul":            "r_and_b",
}

# Keywords that trigger genre detection
_GENRE_KEYWORDS: Dict[str, List[str]] = {
    "trap":      ["trap", "drill", "trap beat", "808 bass", "trap music"],
    "house":     ["house", "4-on-the-floor", "deep house", "tech house", "edm"],
    "techno":    ["techno", "industrial", "techno beat", "berlin"],
    "dnb":       ["dnb", "drum and bass", "jungle", "neurofunk", "liquid"],
    "boom_bap":  ["boom bap", "boom-bap", "classic hip hop", "golden age"],
    "lofi":      ["lofi", "lo-fi", "lo fi", "chill", "study beats"],
    "hip_hop":   ["hip hop", "hip-hop", "rap", "hiphop"],
    "afrobeats": ["afro", "afrobeats", "afropop", "amapiano"],
    "uk_garage": ["uk garage", "garage", "2step", "grime"],
    "jazz":      ["jazz", "bebop", "swing", "blues jazz"],
    "funk":      ["funk", "funky", "groove", "james brown"],
    "rock":      ["rock", "punk", "power chords", "guitar rock"],
    "ambient":   ["ambient", "atmospheric", "drone", "meditation", "space"],
    "r_and_b":   ["r&b", "rnb", "r and b", "soul", "neo soul"],
    "techno":    ["techno", "industrial techno"],
    "reggaeton": ["reggaeton", "dembow", "latin urban"],
}


def get_genre_profile(genre: str) -> Optional[Dict]:
    """Return the profile for a genre name (case-insensitive, alias-aware)."""
    normalized = genre.lower().strip().replace("-", "_").replace(" ", "_")
    normalized = _GENRE_ALIASES.get(normalized, normalized)
    return GENRE_PROFILES.get(normalized)


def detect_genre(text: str) -> Optional[str]:
    """
    Detect genre from free-form text using keyword matching.

    Returns the genre name string or None if no match.
    """
    text_lower = text.lower()
    for genre, keywords in _GENRE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return genre
    return None


def get_available_genres() -> List[str]:
    """Return sorted list of all genre names with profiles."""
    return sorted(GENRE_PROFILES.keys())


def get_genre_kit_catalog_for_ai() -> str:
    """
    Return a compact, AI-readable kit catalog grouped by genre.
    Used in system prompts.
    """
    from backend.services.daw.registry import get_all_kits

    all_kits = {k["id"]: k for k in get_all_kits()}
    categories = {}
    for kit in get_all_kits():
        cat = kit.get("category", "Other")
        categories.setdefault(cat, []).append(f'{kit["id"]} ({kit["name"]})')

    lines = ["DRUM KITS (use kit_id in drum_pattern):"]
    for cat in ["Classic", "Electronic", "Acoustic", "Creative"]:
        if cat in categories:
            lines.append(f"  {cat}: {', '.join(categories[cat])}")

    return "\n".join(lines)
