"""
Drum Patterns & GM Note Mapping

The AI specifies drum parts by VOICE NAME (kick, snare, hihat_closed).
This module maps voice names to GM MIDI note numbers, which is what our
drum kit registry uses as pad addresses.

Also provides genre-specific rhythm pattern templates derived from the
kit registry's demo patterns.
"""

from typing import Dict, List, Optional


# ── Standard GM Drum Note Map ────────────────────────────────────────────────
# These MIDI note numbers are the same across all kits because the kits
# use GM layout as the addressing scheme. The playback engine routes note 36
# to whatever synthdef is in kit.pads[36] at runtime.

GM_DRUM_MAP: Dict[str, int] = {
    # Bass drums
    "kick":              36,
    "kick2":             35,

    # Snares / rims
    "rim":               37,
    "rimshot":           37,
    "side_stick":        37,
    "snare":             38,
    "snare2":            40,
    "snare_tight":       40,

    # Claps / hand percussion
    "clap":              39,
    "hand_clap":         39,

    # Hi-hats
    "hihat_closed":      42,
    "hihat_pedal":       44,
    "hihat_open":        46,

    # Toms
    "tom_floor_lo":      41,
    "tom_low":           45,
    "tom_mid":           47,
    "tom_hi":            48,
    "tom_high":          50,

    # Cymbals
    "crash":             49,
    "crash2":            57,
    "ride":              51,
    "ride2":             59,
    "ride_bell":         53,
    "china":             52,
    "splash":            55,

    # Accessories
    "tambourine":        54,
    "cowbell":           56,
    "vibraslap":         58,
    "bongo_hi":          60,
    "bongo_lo":          61,
    "conga_mute":        62,
    "conga_hi":          63,
    "conga_lo":          64,
    "timbale_hi":        65,
    "timbale_lo":        66,
    "agogo_hi":          67,
    "agogo_lo":          68,
    "cabasa":            69,
    "shaker":            69,
    "maracas":           70,
    "whistle_hi":        71,
    "whistle_lo":        72,
    "guiro_short":       73,
    "guiro_long":        74,
    "claves":            75,
    "woodblock_hi":      76,
    "woodblock_lo":      77,
    "cuica_mute":        78,
    "cuica_open":        79,
    "triangle_mute":     80,
    "triangle_open":     81,
}

# Tolerance aliases — accept common shorthand from the AI
_VOICE_ALIASES: Dict[str, str] = {
    "hh":             "hihat_closed",
    "hh_closed":      "hihat_closed",
    "hh_open":        "hihat_open",
    "hh_pedal":       "hihat_pedal",
    "hat":            "hihat_closed",
    "hat_closed":     "hihat_closed",
    "hat_open":       "hihat_open",
    "open_hat":       "hihat_open",
    "closed_hat":     "hihat_closed",
    "bd":             "kick",
    "bass_drum":      "kick",
    "sd":             "snare",
    "snaredrum":      "snare",
    "cr":             "crash",
    "rd":             "ride",
}


def voice_to_midi_note(voice: str) -> int:
    """
    Resolve a drum voice name to its GM MIDI note number.

    Accepts exact names, aliases, and is case-insensitive.
    Falls back to 36 (kick) with a warning if unknown.
    """
    v = voice.strip().lower().replace(" ", "_").replace("-", "_")
    v = _VOICE_ALIASES.get(v, v)
    if v in GM_DRUM_MAP:
        return GM_DRUM_MAP[v]
    # Try partial match
    for key, midi in GM_DRUM_MAP.items():
        if v in key or key in v:
            return midi
    # Fallback — log warning downstream if desired
    return 36


def get_all_voice_names() -> List[str]:
    """Return sorted list of all recognized drum voice names."""
    return sorted(set(list(GM_DRUM_MAP.keys()) + list(_VOICE_ALIASES.keys())))


# ── Genre Drum Pattern Templates ─────────────────────────────────────────────
# Format: list of {voice, beats, velocities (optional)}
# beats: beat offsets within a 1-bar pattern (in a 4/4 bar = beats 0–3.75)
# Patterns repeat every bar.

GENRE_PATTERNS: Dict[str, List[Dict]] = {

    "trap": [
        {"voice": "kick",         "beats": [0.0, 2.5],
         "velocities": [110, 95]},
        {"voice": "snare",        "beats": [2.0],
         "velocities": [100]},
        {"voice": "clap",         "beats": [2.0],
         "velocities": [90]},
        # Rapid 16th hi-hats with velocity variation
        {"voice": "hihat_closed", "beats": [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75,
                                             2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75],
         "velocities": [80, 50, 70, 45, 80, 50, 70, 45, 80, 50, 70, 45, 80, 50, 70, 45]},
        {"voice": "hihat_open",   "beats": [1.75, 3.75],
         "velocities": [70, 70]},
    ],

    "house": [
        {"voice": "kick",         "beats": [0.0, 1.0, 2.0, 3.0],
         "velocities": [110, 105, 110, 105]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [90, 95]},
        {"voice": "clap",         "beats": [1.0, 3.0],
         "velocities": [80, 80]},
        # Offbeat hi-hats
        {"voice": "hihat_closed", "beats": [0.5, 1.5, 2.5, 3.5],
         "velocities": [75, 75, 75, 75]},
        {"voice": "hihat_open",   "beats": [0.75, 2.75],
         "velocities": [65, 65]},
    ],

    "techno": [
        {"voice": "kick",         "beats": [0.0, 1.0, 2.0, 3.0],
         "velocities": [120, 115, 120, 115]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [85, 85]},
        # Open hat on 8th notes
        {"voice": "hihat_open",   "beats": [0.5, 1.5, 2.5, 3.5],
         "velocities": [70, 65, 70, 65]},
        {"voice": "crash",        "beats": [0.0],
         "velocities": [80]},
    ],

    "dnb": [
        # Amen-ish pattern
        {"voice": "kick",         "beats": [0.0, 1.75, 2.5],
         "velocities": [110, 90, 100]},
        {"voice": "snare",        "beats": [0.5, 1.0, 2.0, 3.5],
         "velocities": [100, 70, 105, 85]},
        {"voice": "hihat_closed", "beats": [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75,
                                             2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75],
         "velocities": [75, 45, 80, 45, 75, 45, 80, 45, 75, 45, 80, 45, 75, 45, 80, 45]},
    ],

    "boom_bap": [
        {"voice": "kick",         "beats": [0.0, 2.5, 3.0],
         "velocities": [110, 95, 85]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [100, 100]},
        # Swung 8th hi-hats
        {"voice": "hihat_closed", "beats": [0.0, 0.67, 1.0, 1.67, 2.0, 2.67, 3.0, 3.67],
         "velocities": [80, 55, 80, 55, 80, 55, 80, 55]},
        {"voice": "hihat_open",   "beats": [0.33, 2.33],
         "velocities": [60, 60]},
    ],

    "lofi": [
        {"voice": "kick",         "beats": [0.0, 2.0, 2.75],
         "velocities": [90, 80, 70]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [85, 80]},
        {"voice": "hihat_closed", "beats": [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
         "velocities": [65, 50, 65, 50, 65, 50, 65, 50]},
    ],

    "afrobeats": [
        {"voice": "kick",         "beats": [0.0, 1.5, 2.0, 3.5],
         "velocities": [100, 85, 95, 80]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [90, 90]},
        {"voice": "clap",         "beats": [0.5, 2.5],
         "velocities": [80, 80]},
        {"voice": "hihat_closed", "beats": [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75,
                                             2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75],
         "velocities": [70, 50, 70, 50, 70, 50, 70, 50, 70, 50, 70, 50, 70, 50, 70, 50]},
        {"voice": "conga_lo",     "beats": [0.75, 2.75],
         "velocities": [75, 70]},
    ],

    "uk_garage": [
        {"voice": "kick",         "beats": [0.0, 1.5, 2.0],
         "velocities": [105, 90, 100]},
        {"voice": "snare",        "beats": [1.0, 3.0, 3.5],
         "velocities": [95, 95, 75]},
        {"voice": "hihat_closed", "beats": [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
         "velocities": [80, 60, 80, 60, 80, 60, 80, 60]},
    ],

    "hip_hop": [
        {"voice": "kick",         "beats": [0.0, 2.5],
         "velocities": [105, 95]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [100, 100]},
        {"voice": "hihat_closed", "beats": [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
         "velocities": [75, 55, 75, 55, 75, 55, 75, 55]},
    ],

    "funk": [
        {"voice": "kick",         "beats": [0.0, 0.75, 2.0, 3.5],
         "velocities": [110, 80, 105, 75]},
        {"voice": "snare",        "beats": [1.0, 2.5, 3.0],
         "velocities": [100, 75, 90]},
        {"voice": "hihat_closed", "beats": [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75,
                                             2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75],
         "velocities": [80, 50, 85, 50, 80, 50, 85, 50, 80, 50, 85, 50, 80, 50, 85, 50]},
        {"voice": "hihat_open",   "beats": [1.75, 3.75],
         "velocities": [70, 70]},
    ],

    "rock": [
        {"voice": "kick",         "beats": [0.0, 2.0],
         "velocities": [115, 110]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [105, 105]},
        {"voice": "hihat_closed", "beats": [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
         "velocities": [85, 70, 85, 70, 85, 70, 85, 70]},
        {"voice": "crash",        "beats": [0.0],
         "velocities": [90]},
    ],

    "jazz": [
        # Ride cymbal pattern with jazz feel
        {"voice": "ride",         "beats": [0.0, 0.67, 1.0, 1.67, 2.0, 2.67, 3.0, 3.67],
         "velocities": [80, 60, 75, 55, 80, 60, 75, 55]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [70, 65]},
        {"voice": "kick",         "beats": [0.0, 2.5],
         "velocities": [85, 75]},
        {"voice": "hihat_pedal",  "beats": [1.0, 3.0],
         "velocities": [70, 70]},
    ],

    "reggaeton": [
        # Dembow pattern
        {"voice": "kick",         "beats": [0.0, 0.75, 2.0, 2.75],
         "velocities": [105, 90, 100, 90]},
        {"voice": "snare",        "beats": [1.0, 3.0],
         "velocities": [95, 90]},
        {"voice": "hihat_closed", "beats": [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5],
         "velocities": [70, 55, 70, 55, 70, 55, 70, 55]},
    ],
}


def get_genre_pattern(genre: str) -> Optional[List[Dict]]:
    """Return the drum pattern template for a genre, or None if not found."""
    return GENRE_PATTERNS.get(genre.lower().replace("-", "_").replace(" ", "_"))


def get_available_genres() -> List[str]:
    """Return sorted list of genres with built-in patterns."""
    return sorted(GENRE_PATTERNS.keys())


def generate_drum_notes_from_pattern(
    pattern: List[Dict],
    bars: int = 1,
    beats_per_bar: int = 4,
) -> List[Dict]:
    """
    Expand a voice-based drum pattern across N bars into compact MIDI note dicts.

    Each voice entry: {"voice": str, "beats": List[float], "velocities": List[int]}

    Returns list of {n, s, d, v} compact dicts.
    """
    events = []
    for voice_spec in pattern:
        voice_name = voice_spec["voice"]
        midi_note = voice_to_midi_note(voice_name)
        beats = voice_spec.get("beats", [])
        velocities = voice_spec.get("velocities", [100] * len(beats))

        for bar in range(bars):
            bar_offset = bar * beats_per_bar
            for i, beat in enumerate(beats):
                abs_beat = bar_offset + beat
                vel = velocities[i % len(velocities)]
                events.append({"n": midi_note, "s": abs_beat, "d": 0.1, "v": int(vel)})

    return sorted(events, key=lambda e: e["s"])
