"""
Electronic & Club Drum Kits

Contemporary electronic music production styles: Trap, House, Techno,
Drum & Bass, Boom Bap, Lo-Fi, UK Garage, and Afrobeats.

demo format: [beat, midi_note, velocity, duration_beats]
"""

KITS = [

    {
        "id": "trap-kit",
        "name": "Trap Kit",
        "category": "Electronic",
        "description": "Booming sub kick, crispy snare, rapid 808 hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 40.0,  "decay": 1.20}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.20, "tone": 0.20, "noise": 0.90}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.07}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.18, "spread": 0.60}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.035}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.02}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.20}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 45.0,  "decay": 0.45}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 58.0,  "decay": 0.35}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 72.0,  "decay": 0.26}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.8}},
        },
        "demo_bpm": 140,
        "demo": [
            # Trap: booming kick, snare on 3, rapid 16th-note hats
            [0.0,   36, 100, 0.9],
            [0.0,   42,  80, 0.2],
            [0.25,  42,  65, 0.2],
            [0.5,   42,  75, 0.2],
            [0.75,  42,  60, 0.2],
            [1.0,   42,  80, 0.2],
            [1.25,  42,  65, 0.2],
            [1.5,   42,  75, 0.2],
            [1.75,  42,  60, 0.2],
            [2.0,   36, 100, 0.7],
            [2.0,   38,  90, 0.2],   # snare on beat 3
            [2.0,   42,  80, 0.2],
            [2.25,  42,  65, 0.2],
            [2.5,   42,  75, 0.2],
            [2.75,  42,  60, 0.2],
            [3.0,   42,  80, 0.2],
            [3.25,  42,  65, 0.2],
            [3.5,   42,  75, 0.2],
            [3.75,  42,  55, 0.2],
        ],
    },

    {
        "id": "house-kit",
        "name": "House Kit",
        "category": "Electronic",
        "description": "909-based, compressed kick, sizzle hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.50}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.30, "noise": 0.80}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.08}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.20, "spread": 0.50}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.045}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.38}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 58.0,  "decay": 0.30}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 76.0,  "decay": 0.24}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 96.0,  "decay": 0.18}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.4}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.2}},
        },
        "demo_bpm": 126,
        "demo": [
            # House: 4-on-the-floor kick, open hat on the offbeats
            [0.0,  36, 100, 0.45],
            [0.0,  42,  65, 0.2],
            [0.5,  42,  55, 0.2],
            [1.0,  36,  92, 0.4],
            [1.0,  38,  85, 0.25],
            [1.0,  42,  65, 0.2],
            [1.5,  42,  55, 0.2],
            [1.75, 46,  72, 0.4],   # open hat
            [2.0,  36, 100, 0.45],
            [2.0,  42,  65, 0.2],
            [2.5,  42,  55, 0.2],
            [3.0,  36,  92, 0.4],
            [3.0,  38,  85, 0.25],
            [3.0,  42,  65, 0.2],
            [3.5,  42,  55, 0.2],
            [3.75, 46,  72, 0.4],
        ],
    },

    {
        "id": "techno-kit",
        "name": "Techno Kit",
        "category": "Electronic",
        "description": "Industrial kick, metallic snare, percussive",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 50.0,  "decay": 0.65}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.18, "tone": 0.15, "noise": 0.95}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.06}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.14, "spread": 0.70}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.25}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 50.0,  "decay": 0.40}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 65.0,  "decay": 0.30}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 85.0,  "decay": 0.22}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 800.0, "decay": 0.20}},
        },
        "demo_bpm": 135,
        "demo": [
            # Techno: driving 4-on-floor, metallic accents, cowbell
            [0.0,  36, 100, 0.55],
            [0.0,  42,  75, 0.2],
            [0.5,  42,  60, 0.2],
            [1.0,  36,  95, 0.5],
            [1.0,  38,  85, 0.2],
            [1.0,  42,  75, 0.2],
            [1.5,  42,  60, 0.2],
            [2.0,  36, 100, 0.55],
            [2.0,  42,  75, 0.2],
            [2.5,  42,  60, 0.2],
            [2.75, 56,  72, 0.2],   # cowbell
            [3.0,  36,  95, 0.5],
            [3.0,  38,  85, 0.2],
            [3.0,  42,  75, 0.2],
            [3.5,  42,  60, 0.2],
            [3.75, 56,  68, 0.2],   # cowbell
        ],
    },

    {
        "id": "dnb-kit",
        "name": "Drum & Bass Kit",
        "category": "Electronic",
        "description": "Massive kick, cracking snare, complex breaks",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 46.0,  "decay": 0.90}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.26, "tone": 0.25, "noise": 0.85}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.08}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.22, "spread": 0.55}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.30}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 48.0,  "decay": 0.50}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 62.0,  "decay": 0.38}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 80.0,  "decay": 0.28}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.6}},
        },
        "demo_bpm": 174,
        "demo": [
            # D&B Amen-style: kick on 1, snare on 2, syncopated hats
            [0.0,  36, 100, 0.7],
            [0.0,  42,  72, 0.2],
            [0.25, 42,  60, 0.2],
            [0.5,  42,  70, 0.2],
            [0.75, 42,  55, 0.2],
            [1.0,  38,  92, 0.3],
            [1.0,  42,  72, 0.2],
            [1.25, 42,  60, 0.2],
            [1.5,  42,  68, 0.2],
            [1.75, 42,  55, 0.2],
            [2.0,  36,  88, 0.5],
            [2.25, 36,  75, 0.3],   # kick ghost — syncopation
            [2.5,  42,  70, 0.2],
            [2.75, 42,  55, 0.2],
            [3.0,  38,  92, 0.3],
            [3.0,  42,  72, 0.2],
            [3.5,  42,  70, 0.2],
            [3.75, 42,  55, 0.2],
        ],
    },

    {
        "id": "boom-bap",
        "name": "Boom Bap Kit",
        "category": "Electronic",
        "description": "Fat kick, punchy snare, swinging hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 54.0,  "decay": 0.70}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.30, "tone": 0.50, "noise": 0.65}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.10}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.20, "spread": 0.45}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.42}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 56.0,  "decay": 0.35}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 72.0,  "decay": 0.28}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 90.0,  "decay": 0.20}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.5}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.2}},
        },
        "demo_bpm": 90,
        "demo": [
            # Boom bap: fat swung groove, rimshot fill, ghost kick
            [0.0,  36, 100, 0.6],
            [0.0,  42,  72, 0.25],
            [0.5,  42,  60, 0.25],
            [1.0,  38,  90, 0.3],
            [1.0,  42,  72, 0.25],
            [1.5,  36,  75, 0.4],   # ghost kick (syncopated)
            [1.5,  42,  58, 0.25],
            [2.0,  36, 100, 0.6],
            [2.0,  42,  72, 0.25],
            [2.5,  42,  60, 0.25],
            [2.75, 37,  68, 0.15],  # rimshot fill
            [3.0,  38,  90, 0.3],
            [3.0,  42,  72, 0.25],
            [3.5,  42,  58, 0.25],
        ],
    },

    {
        "id": "lo-fi-kit",
        "name": "Lo-Fi Kit",
        "category": "Electronic",
        "description": "Dusty, pitched down, vinyl-warped character",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 48.0,  "decay": 0.75}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.32, "tone": 0.60, "noise": 0.55}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.12}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.25, "spread": 0.35}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.08}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.50}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 50.0,  "decay": 0.40}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 64.0,  "decay": 0.32}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 82.0,  "decay": 0.24}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.8}},
        },
        "demo_bpm": 85,
        "demo": [
            # Lo-fi: laid-back, dusty, with ghost kick for that sample-flip feel
            [0.0,  36,  90, 0.6],
            [0.0,  42,  65, 0.25],
            [0.5,  42,  55, 0.25],
            [1.0,  38,  82, 0.3],
            [1.0,  42,  65, 0.25],
            [1.5,  42,  55, 0.25],
            [2.0,  36,  90, 0.6],
            [2.0,  42,  65, 0.25],
            [2.25, 36,  65, 0.35],  # ghost kick
            [2.5,  42,  55, 0.25],
            [3.0,  38,  82, 0.3],
            [3.0,  42,  65, 0.25],
            [3.5,  42,  55, 0.25],
        ],
    },

    {
        "id": "uk-garage",
        "name": "UK Garage Kit",
        "category": "Electronic",
        "description": "2-step pattern sounds, shuffled hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.48}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.35, "noise": 0.78}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.07}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.16, "spread": 0.55}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.28}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 60.0,  "decay": 0.26}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 78.0,  "decay": 0.20}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 98.0,  "decay": 0.16}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.2}},
        },
        "demo_bpm": 130,
        "demo": [
            # UK Garage: 2-step — kick skips beat 2, syncopated synth hits
            [0.0,  36, 100, 0.45],
            [0.0,  42,  68, 0.2],
            [0.5,  42,  58, 0.2],
            [1.0,  38,  88, 0.25],
            [1.0,  42,  68, 0.2],
            [1.25, 36,  80, 0.3],   # 2-step syncopation
            [1.5,  42,  58, 0.2],
            [2.0,  36, 100, 0.45],
            [2.0,  42,  68, 0.2],
            [2.5,  42,  58, 0.2],
            [3.0,  38,  88, 0.25],
            [3.0,  46,  72, 0.35],  # open hat
            [3.0,  42,  68, 0.2],
            [3.5,  42,  58, 0.2],
            [3.75, 36,  75, 0.3],   # 2-step syncopation
        ],
    },

    {
        "id": "afrobeats",
        "name": "Afrobeats Kit",
        "category": "Electronic",
        "description": "Percussion-forward, talking drum character",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 55.0,  "decay": 0.55}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.26, "tone": 0.45, "noise": 0.60}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.11}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.18, "spread": 0.40}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.35}},
            60: {"synthdef": "tomHigh808",    "params": {"freq": 110.0, "decay": 0.18}},
            61: {"synthdef": "tomHigh808",    "params": {"freq": 130.0, "decay": 0.15}},
            64: {"synthdef": "tomMid808",     "params": {"freq": 85.0,  "decay": 0.22}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 520.0, "decay": 0.28}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.3}},
        },
        "demo_bpm": 112,
        "demo": [
            # Afrobeats: conga-forward, cowbell on 3, talking drum layers
            [0.0,  36,  95, 0.5],
            [0.0,  64,  82, 0.25],  # conga low
            [0.25, 60,  75, 0.2],   # conga hi
            [0.5,  64,  78, 0.2],
            [0.75, 56,  70, 0.25],  # cowbell
            [1.0,  38,  85, 0.25],
            [1.0,  64,  80, 0.25],
            [1.25, 61,  70, 0.2],   # conga hi-alt
            [1.5,  60,  75, 0.2],
            [1.75, 56,  65, 0.2],
            [2.0,  36,  95, 0.5],
            [2.0,  64,  82, 0.25],
            [2.25, 42,  65, 0.2],   # hi-hat
            [2.5,  64,  75, 0.2],
            [2.75, 56,  72, 0.25],
            [3.0,  38,  85, 0.25],
            [3.0,  64,  80, 0.25],
            [3.25, 61,  70, 0.2],
            [3.5,  60,  75, 0.2],
            [3.75, 56,  65, 0.2],
        ],
    },

    {
        "id": "jersey-club",
        "name": "Jersey Club",
        "category": "Electronic",
        "description": "Tresillo bouncing kicks, staccato 16th hats, 130–140 BPM",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 52.0,  "decay": 0.32}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.18, "tone": 0.28, "noise": 0.82}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.14, "spread": 0.65}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.20}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
        },
        "demo_bpm": 135,
        "demo": [
            # Jersey Club — tresillo-style bouncing kicks, dense staccato 16ths
            # Snare on beats 1 & 3 (not 2 & 4) — the Club inversion
            [0.0,  36, 110, 0.3],
            [0.0,  38,  90, 0.18],  # snare on beat 1
            [0.0,  42,  75, 0.12],
            [0.25, 42,  55, 0.1],
            [0.5,  36,  92, 0.25],
            [0.5,  42,  70, 0.12],
            [0.75, 42,  50, 0.1],
            [1.0,  36,  80, 0.22],
            [1.0,  42,  75, 0.12],
            [1.25, 36,  88, 0.25],  # tresillo — kick on "e-of-2"
            [1.25, 42,  55, 0.1],
            [1.5,  36,  78, 0.2],   # tresillo — kick on "and-of-2"
            [1.5,  42,  70, 0.12],
            [1.75, 42,  50, 0.1],
            [2.0,  36, 110, 0.3],
            [2.0,  38,  90, 0.18],  # snare on beat 3
            [2.0,  42,  75, 0.12],
            [2.25, 36,  85, 0.22],
            [2.25, 42,  55, 0.1],
            [2.5,  36,  78, 0.2],   # tresillo
            [2.5,  42,  70, 0.12],
            [2.75, 36,  72, 0.18],  # tresillo
            [2.75, 42,  50, 0.1],
            [3.0,  36,  90, 0.22],
            [3.0,  42,  75, 0.12],
            [3.25, 42,  55, 0.1],
            [3.5,  36, 100, 0.28],
            [3.5,  42,  70, 0.12],
            [3.75, 36,  88, 0.22],
            [3.75, 42,  50, 0.1],
        ],
    },

    {
        "id": "footwork",
        "name": "Footwork / Juke",
        "category": "Electronic",
        "description": "Chicago footwork — 160 BPM polyrhythmic kicks, frenetic 16ths",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 50.0,  "decay": 0.28}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.15, "tone": 0.25, "noise": 0.85}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.12, "spread": 0.70}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.035}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.18}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 0.8}},
        },
        "demo_bpm": 160,
        "demo": [
            # Chicago footwork — rapid polyrhythmic kicks, NOT on 2 & 4, frenetic
            [0.0,  36, 110, 0.25],
            [0.0,  42,  80, 0.12],
            [0.25, 36,  85, 0.2],   # rapid double kick
            [0.25, 42,  60, 0.1],
            [0.5,  42,  75, 0.12],
            [0.75, 36,  92, 0.22],
            [0.75, 42,  55, 0.1],
            [1.0,  38,  90, 0.18],
            [1.0,  36,  78, 0.2],   # kick + snare
            [1.0,  42,  80, 0.12],
            [1.25, 36,  88, 0.22],
            [1.25, 42,  60, 0.1],
            [1.5,  36, 100, 0.25],
            [1.5,  42,  75, 0.12],
            [1.75, 42,  55, 0.1],
            [2.0,  36, 110, 0.25],
            [2.0,  42,  80, 0.12],
            [2.25, 42,  60, 0.1],
            [2.5,  36,  92, 0.22],
            [2.5,  38,  85, 0.18],  # snare on offbeat
            [2.5,  42,  75, 0.12],
            [2.75, 36,  80, 0.2],
            [2.75, 42,  55, 0.1],
            [3.0,  36, 100, 0.25],
            [3.0,  42,  80, 0.12],
            [3.25, 36,  88, 0.22],
            [3.25, 42,  60, 0.1],
            [3.5,  36,  85, 0.2],
            [3.5,  42,  75, 0.12],
            [3.75, 38,  88, 0.18],
            [3.75, 42,  55, 0.1],
        ],
    },

    {
        "id": "dembow",
        "name": "Reggaeton / Dembow",
        "category": "Electronic",
        "description": "4-on-floor kick, dembow snare on 16th positions 4/7/12/15",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 55.0,  "decay": 0.45}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.35, "noise": 0.72}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.18, "spread": 0.50}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.35}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.2}},
        },
        "demo_bpm": 95,
        "demo": [
            # Dembow riddim — 4-on-floor kicks + snare on 16th positions 4, 7, 12, 15
            # Derived from Shabba Ranks "Dem Bow" (Steely & Clevie, 1989)
            [0.0,  36, 105, 0.4],   # kick beat 1
            [0.0,  42,  68, 0.2],
            [0.5,  42,  55, 0.2],
            [1.0,  36,  95, 0.35],  # kick beat 2
            [1.0,  38,  88, 0.25],  # snare pos 4 (beat 1.0)
            [1.0,  42,  68, 0.2],
            [1.5,  42,  55, 0.2],
            [1.75, 38,  80, 0.2],   # snare pos 7 (beat 1.75 = "a-of-2")
            [2.0,  36, 105, 0.4],   # kick beat 3
            [2.0,  42,  68, 0.2],
            [2.5,  42,  55, 0.2],
            [3.0,  36,  95, 0.35],  # kick beat 4
            [3.0,  38,  88, 0.25],  # snare pos 12 (beat 3.0)
            [3.0,  39,  78, 0.2],   # clap accent on snare
            [3.0,  42,  68, 0.2],
            [3.5,  42,  55, 0.2],
            [3.75, 38,  80, 0.2],   # snare pos 15 (beat 3.75 = the pickup)
        ],
    },

    {
        "id": "cumbia",
        "name": "Cumbia",
        "category": "Electronic",
        "description": "Colombian folkloric — tambora bass, guacharaca pulse, clave groove",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.60}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.25, "tone": 0.50, "noise": 0.58}},
            60: {"synthdef": "tomHigh808",    "params": {"freq": 112.0, "decay": 0.22}},
            61: {"synthdef": "tomHigh808",    "params": {"freq": 132.0, "decay": 0.18}},
            64: {"synthdef": "tomMid808",     "params": {"freq": 85.0,  "decay": 0.28}},
            69: {"synthdef": "hihatClosed808","params": {"decay": 0.12}},
            70: {"synthdef": "hihatClosed808","params": {"decay": 0.08}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 520.0, "decay": 0.30}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.3}},
        },
        "demo_bpm": 92,
        "demo": [
            # Cumbia — tambora kick on 1&3, llamador backbeat, guacharaca 16ths
            [0.0,  36,  92, 0.5],   # tambora (bass drum) beat 1
            [0.0,  69,  65, 0.2],   # guacharaca downstroke
            [0.0,  64,  85, 0.22],  # lo conga open
            [0.25, 69,  50, 0.15],  # guacharaca
            [0.5,  61,  80, 0.2],   # lo bongo
            [0.5,  69,  58, 0.15],  # guacharaca
            [0.75, 69,  48, 0.12],
            [1.0,  38,  82, 0.28],  # llamador (backbeat)
            [1.0,  69,  65, 0.2],
            [1.25, 69,  50, 0.15],
            [1.5,  61,  75, 0.22],  # bongo call
            [1.5,  69,  58, 0.15],
            [1.75, 60,  70, 0.18],  # hi bongo response
            [1.75, 69,  48, 0.12],
            [2.0,  36,  92, 0.5],   # tambora beat 3
            [2.0,  69,  65, 0.2],
            [2.0,  64,  85, 0.22],  # lo conga
            [2.25, 69,  50, 0.15],
            [2.5,  61,  80, 0.2],   # lo bongo
            [2.5,  69,  58, 0.15],
            [2.75, 56,  72, 0.25],  # cowbell accent
            [2.75, 69,  48, 0.12],
            [3.0,  38,  82, 0.28],  # llamador backbeat
            [3.0,  69,  65, 0.2],
            [3.25, 69,  50, 0.15],
            [3.5,  61,  78, 0.22],  # bongo
            [3.5,  69,  58, 0.15],
            [3.75, 60,  70, 0.18],  # hi bongo
            [3.75, 69,  48, 0.12],
        ],
    },

    {
        "id": "dubstep",
        "name": "Dubstep",
        "category": "Electronic",
        "description": "Half-time feel — kick on 1, massive snare on beat 3, minimal space",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 48.0,  "decay": 0.55}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.35, "tone": 0.40, "noise": 0.68}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.28, "spread": 0.45}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.45}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.4}},
        },
        "demo_bpm": 140,
        "demo": [
            # Dubstep half-time — kick on 1, snare on beat 3, negative space is the art
            [0.0,  36, 110, 0.5],   # kick beat 1
            [0.0,  42,  65, 0.2],
            [0.5,  42,  50, 0.2],
            [1.0,  42,  60, 0.2],
            [1.25, 36,  75, 0.3],   # kick decoration
            [1.5,  42,  55, 0.2],
            [2.0,  42,  60, 0.2],
            [2.5,  42,  50, 0.2],
            [3.0,  38, 105, 0.38],  # THE SNARE — beat 3, defining hit
            [3.0,  39,  95, 0.32],  # clap stack
            [3.0,  42,  65, 0.2],
            [3.5,  42,  52, 0.2],
            [3.75, 36,  70, 0.3],   # kick anticipation into bar 2
        ],
    },

    {
        "id": "grime",
        "name": "Grime",
        "category": "Electronic",
        "description": "UK 140 BPM — dry 2-step, displaced clap, 8-bar cycles, East London",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 55.0,  "decay": 0.38}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.20, "tone": 0.28, "noise": 0.82}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.08}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.14, "spread": 0.65}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.25}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
        },
        "demo_bpm": 140,
        "demo": [
            # Grime 2-step — Wiley/Dizzee era, dry robotic, displaced clap on "a-of-2"
            [0.0,  36, 100, 0.35],
            [0.0,  42,  68, 0.15],
            [0.25, 42,  52, 0.12],
            [0.5,  42,  60, 0.15],
            [0.75, 36,  72, 0.25],  # 2-step syncopated kick
            [0.75, 42,  48, 0.12],
            [1.0,  38,  90, 0.22],
            [1.0,  42,  65, 0.15],
            [1.25, 42,  50, 0.12],
            [1.5,  36,  82, 0.3],
            [1.5,  42,  58, 0.15],
            [1.75, 39,  78, 0.18],  # displaced clap — the off-center grime feel
            [1.75, 42,  45, 0.12],
            [2.0,  36, 100, 0.35],
            [2.0,  42,  68, 0.15],
            [2.25, 42,  52, 0.12],
            [2.5,  42,  60, 0.15],
            [2.75, 36,  72, 0.25],  # 2-step syncopated kick
            [2.75, 42,  48, 0.12],
            [3.0,  38,  90, 0.22],
            [3.0,  42,  65, 0.15],
            [3.25, 42,  50, 0.12],
            [3.5,  36,  82, 0.3],
            [3.5,  42,  58, 0.15],
            [3.75, 39,  78, 0.18],  # displaced clap
            [3.75, 42,  45, 0.12],
        ],
    },

]
