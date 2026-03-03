"""
Melodic Pattern Generators

Pure functions that convert symbolic musical descriptions to compact MIDI note dicts.
These extend the drum abstraction level (kick/snare patterns) to melody, bass, and harmony.

Design:
  - All generators are pure Python — no side effects, no I/O
  - All output List[{n, s, d, v}] compact dicts (same format as drum generators)
  - Theory operations delegate to theory.py — no raw MIDI math here
  - Instrument-agnostic: works with any MIDI synthdef

Beat arithmetic:
  - 1 bar = 4 beats (4/4 only)
  - s (start) values are absolute beats from clip start
  - d (duration) in beats (0.25 = 1 sixteenth note)
"""

import math
from typing import List, Dict, Optional


# ── Rhythm step sizes (beats) ─────────────────────────────────────────────────

_RHYTHM_STEPS: Dict[str, float] = {
    "16th":       0.25,
    "8th":        0.5,
    "dotted_8th": 0.75,
    "triplet":    1.0 / 3.0,
    # "swing_8th" is variable — handled in code
}


# ── Generator 1: Arpeggiation ─────────────────────────────────────────────────

def generate_arp_notes(
    chords: List[str],
    style: str = "up",
    rhythm: str = "16th",
    octave: int = 4,
    octave_range: int = 1,
    bars: int = 4,
    beats_per_chord: float = 4.0,
    velocity: int = 90,
) -> List[Dict]:
    """
    Arpeggiate a chord progression by cycling through chord tones at a rhythm grid.

    Args:
        chords:          Chord symbols (["Am", "F", "C", "G"])
        style:           "up" / "down" / "up_down" / "pinned"
                           up      — ascending cycle (A C E A C E ...)
                           down    — descending cycle (E C A E C A ...)
                           up_down — bounce (A C E C A C E ...)
                           pinned  — root alternates with each tone (A E A C A G ...)
        rhythm:          "16th" / "8th" / "dotted_8th" / "triplet" / "swing_8th"
        octave:          Base octave for chord tones (default 4)
        octave_range:    1 = single octave, 2 = span two octaves of chord tones
        bars:            Total clip length in bars
        beats_per_chord: How many beats each chord occupies
        velocity:        Base note velocity (accented beat-downbeats +15)

    Returns:
        List of {n, s, d, v} compact MIDI dicts.
    """
    if not chords:
        return []

    from backend.services.music.theory import get_chord_notes

    total_beats = bars * 4
    events: List[Dict] = []
    beat = 0.0
    step_num = 0

    while beat < total_beats:
        # ── Step size ─────────────────────────────────────────────────────────
        if rhythm == "swing_8th":
            step = 0.67 if step_num % 2 == 0 else 0.33
        else:
            step = _RHYTHM_STEPS.get(rhythm, 0.25)

        # ── Current chord ─────────────────────────────────────────────────────
        prog_beats = len(chords) * beats_per_chord
        beat_in_prog = beat % prog_beats
        chord_idx = min(int(beat_in_prog / beats_per_chord), len(chords) - 1)
        tones = get_chord_notes(chords[chord_idx], octave=octave, voicing="closed")
        # Clamp base tones first (high octaves + spread voicing can exceed 127)
        tones = [n for n in tones if 0 <= n <= 127]

        if octave_range > 1:
            tones = tones + [n + 12 for n in tones if n + 12 <= 127]

        if not tones:
            beat = round(beat + (step if step else 0.25), 6)
            step_num += 1
            continue

        n_tones = len(tones)

        # ── Note index by style ───────────────────────────────────────────────
        if style == "down":
            idx = (n_tones - 1) - (step_num % n_tones)
        elif style == "up_down" and n_tones > 1:
            cycle = 2 * n_tones - 2
            pos = step_num % cycle
            idx = pos if pos < n_tones else (2 * n_tones - 2 - pos)
        elif style == "pinned":
            # Strictly alternates: root, non-root tone [1], root, non-root tone [2], ...
            # Avoids the bug where (k+1)%n_tones == 0 for small n_tones (root appears twice)
            if step_num % 2 == 0:
                idx = 0
            else:
                # Cycle through non-root tones only (indices 1..n_tones-1)
                non_root_count = max(n_tones - 1, 1)
                idx = (step_num // 2) % non_root_count + 1
                idx = min(idx, n_tones - 1)
        else:  # "up" default
            idx = step_num % n_tones

        idx = max(0, min(n_tones - 1, idx))
        midi_note = tones[idx]

        # ── Velocity accent on beat downbeats ─────────────────────────────────
        beat_in_bar = beat % 4.0
        on_beat = (beat_in_bar % 1.0) < 0.01
        vel = max(1, min(127, velocity + (15 if on_beat else 0)))

        events.append({
            "n": midi_note,
            "s": round(beat, 4),
            "d": round(step * 0.88, 4),
            "v": vel,
        })

        beat = round(beat + step, 6)
        step_num += 1

    return events


# ── Generator 2: Rhythmic Chord Patterns ─────────────────────────────────────

def generate_chord_rhythm(
    chords: List[str],
    rhythm: str = "block",
    beats_per_chord: float = 4.0,
    octave: int = 4,
    voicing: str = "closed",
    velocity: int = 80,
    bars: int = 4,
) -> List[Dict]:
    """
    Generate rhythmically varied chord voicings.

    Extends chord_pattern with rhythmic feel beyond static block chords.

    Args:
        chords:          Chord symbols (["Am", "F", "C", "G"])
        rhythm:          Rhythmic pattern for chord placement:
                           block      — full-duration notes on beat 1 (standard)
                           off_beat   — hits on 8th-note "and"s (0.5, 1.5, 2.5, 3.5)
                           staccato   — short hits on each beat
                           on_beat    — one chord hit per beat, medium length
                           syncopated — hit on beat 1, then off-beat 16ths
        beats_per_chord: Beats per chord change
        octave:          Base octave for chord voicings
        voicing:         "closed" / "open" / "spread"
        velocity:        Base velocity
        bars:            Total clip length in bars

    Returns:
        List of {n, s, d, v} compact MIDI dicts.
    """
    if not chords:
        return []

    from backend.services.music.theory import get_chord_notes

    total_beats = bars * 4
    events: List[Dict] = []

    # Expand chord list to fill requested bars
    full_chords: List[str] = []
    while len(full_chords) * beats_per_chord < total_beats:
        full_chords.extend(chords)

    for i, chord_sym in enumerate(full_chords):
        chord_start = i * beats_per_chord
        if chord_start >= total_beats:
            break

        notes_midi = get_chord_notes(chord_sym, octave=octave, voicing=voicing)

        # ── Rhythm pattern: (beat_offset, duration, velocity_delta) tuples ───
        if rhythm == "block":
            hits = [(0.0, beats_per_chord * 0.9, 0)]

        elif rhythm == "off_beat":
            raw = [0.5, 1.5, 2.5, 3.5]
            hits = [(b, 0.4, -10) for b in raw if b < beats_per_chord]

        elif rhythm == "staccato":
            raw = [0.0, 1.0, 2.0, 3.0]
            hits = [(b, 0.2, 5 if b == 0.0 else -10) for b in raw if b < beats_per_chord]

        elif rhythm == "on_beat":
            n_beats = int(beats_per_chord)
            hits = [(float(b), 0.7, 5 if b == 0 else -5) for b in range(n_beats)]

        elif rhythm == "syncopated":
            raw = [0.0, 0.75, 1.5, 2.25, 3.0]
            hits = [(b, 0.45, 10 if b == 0.0 else -15) for b in raw if b < beats_per_chord]

        else:
            hits = [(0.0, beats_per_chord * 0.9, 0)]

        for beat_off, dur, vel_delta in hits:
            abs_beat = chord_start + beat_off
            if abs_beat >= total_beats:
                break
            vel = max(1, min(127, velocity + vel_delta))
            for midi_note in notes_midi:
                events.append({
                    "n": midi_note,
                    "s": round(abs_beat, 4),
                    "d": round(dur, 4),
                    "v": vel,
                })

    return sorted(events, key=lambda e: e["s"])


# ── Generator 3: Bass Lines ───────────────────────────────────────────────────

def generate_bass_line(
    chords: List[str],
    style: str = "root_pulse",
    octave: int = 2,
    bars: int = 4,
    beats_per_chord: float = 4.0,
    velocity: int = 100,
) -> List[Dict]:
    """
    Generate a bass line derived from a chord progression.

    The bass is always harmonically correct — it uses chord roots
    and tones so every note is in key.

    Args:
        chords:          Chord symbols (["Am", "F", "C", "G"])
        style:           Bass pattern style:
                           root_only     — root note on beat 1 only, long duration
                           root_pulse    — root on every beat (steady pulse)
                           walking       — root + 5th + 7th + chromatic approach to next chord
                           octave_jump   — root alternates with its upper octave
                           syncopated    — root on 1, ghost off-beats (hip-hop/R&B feel)
                           sub_pulse     — every 8th note, sub-bass style (808/EDM feel)
        octave:          Bass register (1 = very deep, 2 = standard bass, 3 = bass melody)
        bars:            Total clip length in bars
        beats_per_chord: How many beats each chord occupies
        velocity:        Base velocity

    Returns:
        List of {n, s, d, v} compact MIDI dicts.
    """
    if not chords:
        return []

    from backend.services.music.theory import get_chord_notes, parse_chord_symbol, note_name_to_midi

    total_beats = bars * 4
    events: List[Dict] = []

    # Expand chord list to fill bars
    full_chords: List[str] = []
    while len(full_chords) * beats_per_chord < total_beats:
        full_chords.extend(chords)

    for i, chord_sym in enumerate(full_chords):
        chord_start = i * beats_per_chord
        if chord_start >= total_beats:
            break

        # Root note at bass octave
        try:
            root, quality = parse_chord_symbol(chord_sym)
            root_midi = note_name_to_midi(f"{root}{octave}")
        except ValueError:
            continue

        # Fifth and upper octave for walking/octave patterns
        fifth_midi = root_midi + 7
        upper_root = root_midi + 12 if root_midi + 12 <= 127 else root_midi

        # Next chord root (for walking approach note)
        next_sym = full_chords[(i + 1) % len(full_chords)]
        try:
            next_root, _ = parse_chord_symbol(next_sym)
            next_root_midi = note_name_to_midi(f"{next_root}{octave}")
        except ValueError:
            next_root_midi = root_midi

        # ── Style patterns ────────────────────────────────────────────────────

        if style == "root_only":
            _add(events, root_midi, chord_start, beats_per_chord * 0.9, velocity, total_beats)

        elif style == "root_pulse":
            for b in range(int(beats_per_chord)):
                t = chord_start + b
                vel = velocity + 10 if b == 0 else velocity - 15
                _add(events, root_midi, t, 0.85, max(50, vel), total_beats)

        elif style == "walking":
            # Beat 1: root
            _add(events, root_midi, chord_start, 0.9, velocity, total_beats)

            if beats_per_chord >= 4:
                # Beat 2: fifth (always safe harmonically)
                _add(events, fifth_midi, chord_start + 1.0, 0.9, velocity - 10, total_beats)
                # Beat 3: highest chord tone (7th for 7th chords, 5th for triads)
                # Use get_chord_notes instead of quality string matching to avoid "m" in "maj" bug
                chord_tones = get_chord_notes(chord_sym, octave=octave, voicing="closed")
                chord_tones = [n for n in chord_tones if 0 <= n <= 127]
                top_tone = chord_tones[-1] if chord_tones else fifth_midi
                _add(events, top_tone, chord_start + 2.0, 0.9, velocity - 15, total_beats)
                # Beat 4: chromatic approach to next root (half-step from above or below)
                diff = next_root_midi - root_midi
                approach = max(0, min(127, next_root_midi + (-1 if diff > 0 else 1)))
                _add(events, approach, chord_start + 3.0, 0.9, velocity - 10, total_beats)

            elif beats_per_chord >= 2:
                # 2-beat version: root + fifth
                _add(events, fifth_midi, chord_start + 1.0, 0.9, velocity - 15, total_beats)

        elif style == "octave_jump":
            _add(events, root_midi, chord_start, 0.9, velocity, total_beats)
            if beats_per_chord >= 2:
                _add(events, upper_root, chord_start + 1.0, 0.4, velocity - 20, total_beats)
            if beats_per_chord >= 4:
                _add(events, root_midi, chord_start + 2.0, 0.9, velocity - 10, total_beats)
                _add(events, upper_root, chord_start + 3.0, 0.4, velocity - 25, total_beats)

        elif style == "syncopated":
            # Beat 1: long root
            _add(events, root_midi, chord_start, 1.5, velocity, total_beats)
            if beats_per_chord >= 4:
                _add(events, root_midi, chord_start + 1.75, 0.4, velocity - 30, total_beats)
                _add(events, root_midi, chord_start + 2.5,  0.9, velocity - 15, total_beats)
                _add(events, root_midi, chord_start + 3.75, 0.4, velocity - 30, total_beats)

        elif style == "sub_pulse":
            # 8th-note pulse, long overlapping sustains
            for off in [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]:
                if off >= beats_per_chord:
                    break
                vel = velocity + 15 if off == 0.0 else velocity - 20
                _add(events, root_midi, chord_start + off, 0.45, max(50, vel), total_beats)

        else:
            _add(events, root_midi, chord_start, beats_per_chord * 0.9, velocity, total_beats)

    return sorted(events, key=lambda e: e["s"])


def _add(
    events: List[Dict],
    note: int,
    start: float,
    dur: float,
    vel: int,
    total_beats: float,
) -> None:
    """Append a note dict if it falls within the clip range and is valid."""
    if 0.0 <= start < total_beats and 0 <= note <= 127:
        events.append({
            "n": note,
            "s": round(start, 4),
            "d": round(max(0.05, dur), 4),
            "v": max(1, min(127, vel)),
        })


# ── Generator 4: Scale Melodies ───────────────────────────────────────────────

def generate_scale_melody(
    root: str,
    scale: str,
    octave: int = 4,
    octave_range: int = 1,
    contour: str = "arch",
    bars: int = 4,
    density: str = "medium",
    velocity: int = 90,
) -> List[Dict]:
    """
    Generate a scale-based melody with a smooth pitch contour.

    The contour describes the melodic shape; Python picks the nearest
    scale degree at each time position. No LLM note-by-note specification needed.

    Args:
        root:        Root note of the scale ("A", "C", "F#", "Bb")
        scale:       Scale name ("pentatonic_minor", "minor", "major", "dorian", etc.)
        octave:      Starting octave (4 = middle C octave)
        octave_range: 1 = single octave, 2 = span two octaves for wider melodic range
        contour:     Melodic shape across the clip:
                       arch    — rises to peak then falls back (sin 0→π)
                       rising  — gradual ascent (with slight variation)
                       falling — gradual descent
                       wave    — full sine wave (rises and falls)
                       valley  — descends to trough then rises back
        bars:        Total clip length in bars
        density:     Note spacing:
                       sparse  — quarter notes (1 beat apart) — hooks, long phrasing
                       medium  — 8th notes (0.5 beats) — standard melody
                       dense   — 16th notes (0.25 beats) — runs, ornaments
        velocity:    Base velocity (beat downbeats +15, off-beat notes -10)

    Returns:
        List of {n, s, d, v} compact MIDI dicts.
    """
    from backend.services.music.theory import get_scale_notes

    # Density → note step size
    step_map = {"sparse": 1.0, "medium": 0.5, "dense": 0.25}
    step = step_map.get(density, 0.5)

    total_beats = bars * 4
    num_steps = int(round(total_beats / step))

    try:
        scale_notes = get_scale_notes(root, scale, octave=octave, num_octaves=octave_range)
    except ValueError:
        return []

    if not scale_notes:
        return []

    n = len(scale_notes)
    events: List[Dict] = []

    # Duration: longer for sparse, gated for dense
    dur_map = {"sparse": step * 0.92, "medium": step * 0.88, "dense": step * 0.75}
    note_dur = dur_map.get(density, step * 0.88)

    for i in range(num_steps):
        beat = i * step
        if beat >= total_beats:
            break

        # Normalized position 0..1 across the clip
        t = i / max(num_steps - 1, 1)

        # ── Contour → scale index ─────────────────────────────────────────────
        if contour == "arch":
            curve = math.sin(t * math.pi)
        elif contour == "rising":
            curve = t + 0.08 * math.sin(t * math.pi * 6)   # linear with subtle wobble
        elif contour == "falling":
            curve = (1.0 - t) + 0.08 * math.sin(t * math.pi * 6)
        elif contour == "wave":
            curve = (math.sin(t * math.pi * 2) + 1.0) / 2.0
        elif contour == "valley":
            curve = 1.0 - math.sin(t * math.pi)             # inverse arch
        else:
            curve = math.sin(t * math.pi)                    # arch as default

        # Map curve (0..1) → scale degree
        idx = int(round(curve * (n - 1)))
        idx = max(0, min(n - 1, idx))
        midi_note = scale_notes[idx]

        # ── Velocity: accent downbeats ────────────────────────────────────────
        beat_in_bar = beat % 4.0
        on_beat = (beat_in_bar % 1.0) < 0.01
        vel = min(127, velocity + (15 if on_beat else (-10 if i % 2 == 1 else 0)))

        events.append({
            "n": midi_note,
            "s": round(beat, 4),
            "d": round(note_dur, 4),
            "v": vel,
        })

    return events
