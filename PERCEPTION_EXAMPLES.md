# Music Perception Pipeline - Before/After Examples

## Example 1: "Add a bassline to this track"

### BEFORE (Current System)

**What AI sees:**
```json
{
  "sequence": {
    "id": "abc123",
    "name": "My Track",
    "tempo": 120,
    "tracks": [
      {
        "id": "track1",
        "name": "Drums",
        "type": "midi",
        "instrument": "drumKit"
      },
      {
        "id": "track2",
        "name": "Melody",
        "type": "midi",
        "instrument": "simpleSynth"
      }
    ],
    "clips": [
      {
        "id": "clip1",
        "track": "track1",
        "type": "midi",
        "start": 0,
        "dur": 4,
        "notes": [
          {"n": 36, "s": 0, "d": 0.5, "v": 100},
          {"n": 38, "s": 1, "d": 0.5, "v": 90},
          {"n": 42, "s": 0.5, "d": 0.25, "v": 70}
        ]
      },
      {
        "id": "clip2",
        "track": "track2",
        "type": "midi",
        "start": 0,
        "dur": 4,
        "notes": [
          {"n": 60, "s": 0, "d": 1, "v": 80},
          {"n": 64, "s": 1, "d": 1, "v": 80},
          {"n": 67, "s": 2, "d": 1, "v": 80}
        ]
      }
    ]
  },
  "musical_context": {
    "key": "C major",
    "note_density": 1.5,
    "complexity": 0.3
  }
}
```

**AI's understanding:**
- "There are 2 tracks with MIDI notes"
- "Key is C major"
- "Some notes at various pitches"
- ❌ **No idea what it SOUNDS like**
- ❌ **No idea what frequency ranges are occupied**
- ❌ **No idea what's missing**

---

### AFTER (New Perception Pipeline)

**What AI sees:**
```json
{
  "composition_perception": {
    "overall_description": "Sparse electronic beat with simple melodic line",
    "genre_hints": ["electronic", "minimal"],
    "mood": "neutral, mechanical",
    
    "frequency_balance": {
      "sub_bass": 0.1,
      "bass": 0.2,
      "low_mid": 0.1,
      "mid": 0.4,
      "high_mid": 0.2,
      "high": 0.3
    },
    
    "frequency_gaps": [
      "sub_bass (20-60Hz) - CRITICAL GAP",
      "bass (60-250Hz) - needs foundation"
    ],
    
    "harmonic_analysis": {
      "overall_key": "C major",
      "chord_progression": "C - F - G (I-IV-V)",
      "harmonic_complexity": "simple"
    },
    
    "suggestions": [
      "Add bass in 40-80Hz range to provide low-end foundation",
      "Bass should follow root notes: C, F, G",
      "Consider sustained bass notes (whole notes) for stability",
      "Avoid sub-bass to prevent muddiness with kick drum"
    ]
  },
  
  "track_perceptions": [
    {
      "track_id": "track1",
      "track_name": "Drums",
      "timbre_description": "Punchy kick (36) with crisp snare (38) and bright hi-hat (42)",
      "harmonic_role": "percussion",
      "rhythmic_role": "driving groove - 4-on-floor kick with offbeat hats",
      "frequency_bands": {
        "sub_bass": 0.3,
        "bass": 0.4,
        "mid": 0.2,
        "high": 0.6
      },
      "dominant_frequency_range": "bass (60-250Hz) and high (6-20kHz)",
      "conflicts_with": [],
      "complements": ["track2"]
    },
    {
      "track_id": "track2",
      "track_name": "Melody",
      "timbre_description": "Simple sine-like synth, clean and pure",
      "harmonic_role": "melody",
      "rhythmic_role": "sustained notes - quarter note rhythm",
      "frequency_bands": {
        "mid": 0.7,
        "high_mid": 0.3
      },
      "dominant_frequency_range": "mid (500-2000Hz)",
      "key_relationship": "tonic - plays C, E, G (C major triad)",
      "conflicts_with": [],
      "complements": ["track1"]
    }
  ]
}
```

**AI's understanding:**
- ✅ "This is a sparse electronic beat with a simple melody"
- ✅ "There's a CRITICAL GAP in the bass frequencies (20-250Hz)"
- ✅ "The melody plays C-F-G (I-IV-V progression)"
- ✅ "I should add a bass that plays root notes C, F, G in 40-80Hz range"
- ✅ "The kick already occupies some bass, so I'll avoid sub-bass"
- ✅ "Sustained whole notes would provide stability"

**AI's action:**
```python
create_midi_clip(
    track_id="new_bass_track",
    notes=[
        {"n": 36, "s": 0, "d": 4, "v": 90},   # C2 - whole note
        {"n": 41, "s": 4, "d": 4, "v": 90},   # F2 - whole note
        {"n": 43, "s": 8, "d": 4, "v": 90}    # G2 - whole note
    ]
)
```

---

## Example 2: "Make this sound warmer"

### BEFORE

**What AI sees:**
```json
{
  "track": {
    "id": "synth1",
    "name": "Lead Synth",
    "instrument": "sawSynth"
  }
}
```

**AI's action:**
❌ Guesses randomly: "Maybe add reverb?"

---

### AFTER

**What AI sees:**
```json
{
  "track_perception": {
    "track_id": "synth1",
    "track_name": "Lead Synth",
    "timbre_description": "Bright, harsh sawtooth with strong high harmonics",
    "frequency_bands": {
      "high_mid": 0.8,
      "high": 0.9
    },
    "audio_analysis": {
      "brightness": 0.85,
      "warmth": 0.15,
      "roughness": 0.7
    }
  },
  "suggestions": [
    "Reduce high frequencies with low-pass filter",
    "Add low-mid energy (250-500Hz) for warmth",
    "Consider switching to triangle/sine wave for smoother timbre"
  ]
}
```

**AI's understanding:**
- ✅ "This synth is VERY bright (0.85) and NOT warm (0.15)"
- ✅ "It has excessive high frequencies"
- ✅ "I need to reduce highs and boost low-mids"

**AI's action:**
```python
add_effect(
    track_id="synth1",
    effect_type="lowPassFilter",
    parameters={"cutoff": 2000, "resonance": 0.3}
)
```

---

## Example 3: "Create a lo-fi hip-hop beat"

### BEFORE

**What AI sees:**
```json
{
  "request": "Create a lo-fi hip-hop beat"
}
```

**AI's action:**
❌ "I don't know how to generate music from scratch"

---

### AFTER

**What AI sees (via MusicGenerator):**
```json
{
  "genre_template": "lo-fi hip-hop",
  "characteristics": {
    "tempo": "70-90 BPM",
    "key": "minor keys preferred",
    "instruments": ["dusty drums", "warm bass", "jazzy chords", "vinyl crackle"],
    "frequency_profile": {
      "sub_bass": 0.3,
      "bass": 0.6,
      "mid": 0.5,
      "high": 0.2
    },
    "rhythmic_style": "laid-back, swung 16ths",
    "harmonic_style": "jazz chords (7ths, 9ths)"
  }
}
```

**AI's action:**
```python
# Generate drums
create_track(name="Drums", type="midi", instrument="lofiDrums")
create_midi_clip(
    notes=[
        # Kick on 1 and 3
        {"n": 36, "s": 0, "d": 0.5, "v": 85},
        {"n": 36, "s": 2, "d": 0.5, "v": 80},
        # Snare on 2 and 4 (slightly swung)
        {"n": 38, "s": 1.1, "d": 0.3, "v": 70},
        {"n": 38, "s": 3.1, "d": 0.3, "v": 75},
        # Hi-hats (swung 16ths)
        ...
    ]
)

# Generate bass
create_track(name="Bass", type="midi", instrument="warmBass")
create_midi_clip(
    notes=[
        {"n": 33, "s": 0, "d": 2, "v": 80},  # A1 - half note
        {"n": 36, "s": 2, "d": 2, "v": 80}   # C2 - half note
    ]
)

# Generate chords
create_track(name="Chords", type="midi", instrument="electricPiano")
create_midi_clip(
    notes=[
        # Am7 chord
        {"n": 57, "s": 0, "d": 2, "v": 60},  # A3
        {"n": 60, "s": 0, "d": 2, "v": 60},  # C4
        {"n": 64, "s": 0, "d": 2, "v": 60},  # E4
        {"n": 67, "s": 0, "d": 2, "v": 60},  # G4
        ...
    ]
)
```

---

## Summary: The Transformation

| Aspect | Before | After |
|--------|--------|-------|
| **Context** | Structural (notes, clips) | Perceptual (timbre, frequency, energy) |
| **Understanding** | "What notes exist" | "What it sounds like" |
| **Suggestions** | Generic guesses | Specific, actionable recommendations |
| **Generation** | Cannot generate | Can generate from text prompts |
| **Token usage** | ~2000 tokens (wasteful) | ~1500 tokens (smart routing) |
| **Quality** | Hit-or-miss | Musically informed |

The AI goes from **seeing** music to **hearing** music.

