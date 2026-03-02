"""
Classic Drum Machine Kits

Iconic hardware drum machines from the golden era of electronic music.
Each kit maps GM note numbers to SynthDef voices with per-pad parameter tuning
that captures the character of the original hardware.

demo format: [beat, midi_note, velocity, duration_beats]
  beat          — position from bar start in quarter-note beats (0.0–3.999)
  midi_note     — GM note number (must exist in this kit's pads)
  velocity      — 0–127
  duration_beats — gate duration in beats (converted to seconds at playback time)
"""

KITS = [

    {
        "id": "808-core",
        "name": "808 Core Kit",
        "category": "Classic",
        "description": "Roland TR-808 — deep sub kick, snappy rim, metallic hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 52.0,  "decay": 0.85}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.35, "tone": 0.5, "noise": 0.6}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.12}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.22, "spread": 0.4}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.45}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 52.0,  "decay": 0.32}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 68.0,  "decay": 0.26}},
            45: {"synthdef": "tomMid808",     "params": {"freq": 82.0,  "decay": 0.20}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 104.0, "decay": 0.16}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.6}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.3}},
            55: {"synthdef": "cymbalSplash",  "params": {"decay": 0.5}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 562.0, "decay": 0.35}},
        },
        "demo_bpm": 95,
        "demo": [
            # Classic hip-hop groove — kick/snare/hat + cowbell
            [0.0,  36, 100, 0.5],
            [0.0,  42,  72, 0.25],
            [0.5,  42,  60, 0.25],
            [1.0,  38,  90, 0.3],
            [1.0,  42,  72, 0.25],
            [1.5,  42,  55, 0.25],
            [2.0,  36, 100, 0.5],
            [2.0,  42,  72, 0.25],
            [2.5,  42,  60, 0.25],
            [2.75, 36,  75, 0.3],   # ghost kick
            [3.0,  38,  90, 0.3],
            [3.0,  56,  78, 0.3],   # cowbell — 808 signature
            [3.0,  42,  72, 0.25],
            [3.5,  42,  55, 0.25],
        ],
    },

    {
        "id": "909-core",
        "name": "909 Core Kit",
        "category": "Classic",
        "description": "Roland TR-909 — punchy kick, snappy snare, crisp hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 60.0,  "decay": 0.55}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.28, "tone": 0.35, "noise": 0.75}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.08}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.18, "spread": 0.55}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.35}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 60.0,  "decay": 0.28}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 78.0,  "decay": 0.22}},
            45: {"synthdef": "tomMid808",     "params": {"freq": 98.0,  "decay": 0.18}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 124.0, "decay": 0.14}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.4}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.1}},
        },
        "demo_bpm": 128,
        "demo": [
            # House/techno 4-on-the-floor with open hat accents
            [0.0,  36, 100, 0.4],
            [0.0,  42,  65, 0.2],
            [0.5,  42,  55, 0.2],
            [1.0,  36,  90, 0.4],
            [1.0,  38,  88, 0.25],
            [1.0,  42,  65, 0.2],
            [1.5,  42,  55, 0.2],
            [1.75, 46,  70, 0.35],  # open hat before beat 3
            [2.0,  36, 100, 0.4],
            [2.0,  42,  65, 0.2],
            [2.5,  42,  55, 0.2],
            [3.0,  36,  90, 0.4],
            [3.0,  38,  88, 0.25],
            [3.0,  42,  65, 0.2],
            [3.5,  42,  55, 0.2],
            [3.75, 46,  70, 0.35],
        ],
    },

    {
        "id": "606-core",
        "name": "606 Core Kit",
        "category": "Classic",
        "description": "Roland TR-606 — light electronic, thin kick, buzzy hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 72.0,  "decay": 0.30}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.20, "tone": 0.25, "noise": 0.85}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.30}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 64.0,  "decay": 0.22}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 82.0,  "decay": 0.18}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 110.0, "decay": 0.14}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 0.9}},
        },
        "demo_bpm": 120,
        "demo": [
            # Simple electro — sparse, light
            [0.0,  36,  88, 0.3],
            [0.0,  42,  65, 0.2],
            [0.5,  42,  55, 0.2],
            [1.0,  38,  80, 0.2],
            [1.0,  42,  65, 0.2],
            [1.5,  42,  52, 0.2],
            [2.0,  36,  88, 0.3],
            [2.0,  42,  65, 0.2],
            [2.5,  42,  55, 0.2],
            [3.0,  38,  80, 0.2],
            [3.0,  46,  68, 0.4],   # open hat
            [3.5,  42,  52, 0.2],
        ],
    },

    {
        "id": "707-core",
        "name": "707 Core Kit",
        "category": "Classic",
        "description": "Roland TR-707 — PCM-style, mid-forward, bright overall",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 65.0,  "decay": 0.40}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.24, "tone": 0.45, "noise": 0.65}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.10}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.15, "spread": 0.6}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.055}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.035}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.32}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 58.0,  "decay": 0.26}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 74.0,  "decay": 0.20}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 94.0,  "decay": 0.16}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.2}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.0}},
        },
        "demo_bpm": 118,
        "demo": [
            # Pop/dance groove with clap stack
            [0.0,  36,  95, 0.4],
            [0.0,  42,  70, 0.2],
            [0.5,  42,  60, 0.2],
            [1.0,  38,  88, 0.25],
            [1.0,  39,  80, 0.2],   # clap doubles snare
            [1.0,  42,  70, 0.2],
            [1.5,  42,  55, 0.2],
            [2.0,  36,  95, 0.4],
            [2.0,  42,  70, 0.2],
            [2.5,  42,  60, 0.2],
            [3.0,  38,  88, 0.25],
            [3.0,  39,  80, 0.2],
            [3.0,  42,  70, 0.2],
            [3.5,  42,  55, 0.2],
        ],
    },

    {
        "id": "505-core",
        "name": "505 Core Kit",
        "category": "Classic",
        "description": "Roland TR-505 — warm, round, slightly pitched sounds",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 56.0,  "decay": 0.60}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.30, "tone": 0.55, "noise": 0.50}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.14}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.20, "spread": 0.45}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.07}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.40}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 55.0,  "decay": 0.35}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 70.0,  "decay": 0.28}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 90.0,  "decay": 0.20}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.5}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 540.0, "decay": 0.45}},
        },
        "demo_bpm": 105,
        "demo": [
            # Warm groove with cowbell accent
            [0.0,  36, 100, 0.5],
            [0.0,  42,  70, 0.25],
            [0.5,  42,  60, 0.25],
            [1.0,  38,  88, 0.3],
            [1.0,  42,  70, 0.25],
            [1.5,  42,  55, 0.25],
            [2.0,  36, 100, 0.5],
            [2.0,  42,  70, 0.25],
            [2.5,  42,  58, 0.25],
            [2.75, 36,  72, 0.3],   # ghost kick
            [3.0,  38,  88, 0.3],
            [3.0,  56,  75, 0.3],   # cowbell
            [3.0,  42,  70, 0.25],
            [3.5,  42,  55, 0.25],
        ],
    },

    {
        "id": "linn-drum",
        "name": "Linn LM-1 Kit",
        "category": "Classic",
        "description": "LinnDrum LM-1 — punchy, dry, iconic early 80s",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 62.0,  "decay": 0.45}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.25, "tone": 0.40, "noise": 0.70}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.09}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.16, "spread": 0.50}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.28}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 62.0,  "decay": 0.30}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 80.0,  "decay": 0.24}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 100.0, "decay": 0.18}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.3}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 580.0, "decay": 0.30}},
        },
        "demo_bpm": 108,
        "demo": [
            # Funky early-80s groove with rimshot fills
            [0.0,  36,  95, 0.45],
            [0.0,  42,  68, 0.2],
            [0.5,  42,  58, 0.2],
            [1.0,  38,  88, 0.25],
            [1.0,  42,  68, 0.2],
            [1.25, 37,  72, 0.1],   # rimshot
            [1.5,  42,  55, 0.2],
            [2.0,  36,  95, 0.45],
            [2.25, 36,  65, 0.3],   # ghost kick
            [2.0,  42,  68, 0.2],
            [2.5,  42,  58, 0.2],
            [3.0,  38,  88, 0.25],
            [3.0,  56,  70, 0.3],   # cowbell
            [3.0,  42,  68, 0.2],
            [3.5,  42,  55, 0.2],
        ],
    },

    {
        "id": "obx-dmx",
        "name": "Oberheim DMX",
        "category": "Classic",
        "description": "8-bit µ-law PCM, gritty punchy — Run-DMC, New Order",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.42}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.35, "noise": 0.78}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.09}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.15, "spread": 0.55}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.045}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.28}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 58.0,  "decay": 0.28}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 74.0,  "decay": 0.22}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 92.0,  "decay": 0.16}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.2}},
        },
        "demo_bpm": 100,
        "demo": [
            # Hip-hop / synth-pop — Run-DMC "Rock Box" feel, ghost snare texture
            [0.0,  36, 100, 0.5],
            [0.0,  42,  70, 0.2],
            [0.5,  42,  55, 0.2],
            [1.0,  38,  92, 0.28],
            [1.0,  42,  70, 0.2],
            [1.5,  42,  55, 0.2],
            [1.75, 38,  65, 0.18],  # ghost snare
            [2.0,  36,  95, 0.45],
            [2.0,  42,  70, 0.2],
            [2.5,  42,  55, 0.2],
            [2.75, 36,  72, 0.28],  # ghost kick
            [3.0,  38,  92, 0.28],
            [3.0,  42,  70, 0.2],
            [3.25, 37,  68, 0.1],   # rimshot
            [3.5,  42,  55, 0.2],
        ],
    },

    {
        "id": "cr-78",
        "name": "Roland CR-78",
        "category": "Classic",
        "description": "World's first programmable drum machine — delicate analog, 1978",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 80.0,  "decay": 0.26}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.20, "tone": 0.62, "noise": 0.48}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.12}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.07}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.30}},
            60: {"synthdef": "tomHigh808",    "params": {"freq": 118.0, "decay": 0.20}},
            61: {"synthdef": "tomHigh808",    "params": {"freq": 148.0, "decay": 0.16}},
            64: {"synthdef": "tomMid808",     "params": {"freq": 88.0,  "decay": 0.24}},
            69: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            70: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 600.0, "decay": 0.28}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
        },
        "demo_bpm": 116,
        "demo": [
            # Disco / pop preset — Blondie "Heart of Glass" feel, maracas pulse
            [0.0,  36,  75, 0.3],
            [0.0,  42,  65, 0.15],
            [0.0,  69,  58, 0.15],  # maracas
            [0.25, 42,  50, 0.12],
            [0.5,  42,  62, 0.15],
            [0.5,  69,  50, 0.12],
            [0.75, 42,  48, 0.12],
            [1.0,  38,  80, 0.22],  # polite snare
            [1.0,  42,  65, 0.15],
            [1.25, 42,  50, 0.12],
            [1.5,  36,  68, 0.28],
            [1.5,  42,  62, 0.15],
            [1.5,  69,  52, 0.12],
            [1.75, 42,  48, 0.12],
            [2.0,  36,  75, 0.3],
            [2.0,  42,  65, 0.15],
            [2.0,  69,  58, 0.15],
            [2.25, 42,  50, 0.12],
            [2.5,  42,  62, 0.15],
            [2.75, 42,  48, 0.12],
            [3.0,  38,  80, 0.22],
            [3.0,  42,  65, 0.15],
            [3.0,  56,  65, 0.22],  # cowbell — CR-78 signature
            [3.25, 42,  50, 0.12],
            [3.5,  36,  62, 0.25],
            [3.5,  42,  62, 0.15],
            [3.75, 42,  48, 0.12],
        ],
    },

    {
        "id": "simmons-sds",
        "name": "Simmons SDS-V",
        "category": "Classic",
        "description": "Pure analog synth pads — massive sub bass, ringing toms, 1981",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 42.0,  "decay": 1.20}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.32, "tone": 0.30, "noise": 0.75}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.35}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 42.0,  "decay": 0.90}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 55.0,  "decay": 0.72}},
            45: {"synthdef": "tomMid808",     "params": {"freq": 70.0,  "decay": 0.55}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 88.0,  "decay": 0.42}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.5}},
        },
        "demo_bpm": 120,
        "demo": [
            # 80s synth-pop with signature descending tom fill — Duran Duran feel
            [0.0,  36, 100, 1.0],   # massive sub kick
            [0.0,  42,  65, 0.15],
            [0.5,  42,  52, 0.15],
            [1.0,  38,  85, 0.35],
            [1.0,  42,  65, 0.15],
            [1.5,  42,  52, 0.15],
            [2.0,  36, 100, 1.0],   # massive sub kick
            [2.0,  42,  65, 0.15],
            [2.5,  42,  52, 0.15],
            [3.0,  38,  85, 0.35],
            [3.0,  48,  90, 0.42],  # high tom — fill starts
            [3.25, 45,  88, 0.55],  # mid tom
            [3.5,  43,  85, 0.72],  # mid-low tom
            [3.75, 41,  82, 0.90],  # floor tom — the iconic "thuuummm"
        ],
    },

    {
        "id": "sp1200",
        "name": "E-mu SP-1200",
        "category": "Classic",
        "description": "12-bit/26kHz sampler — the golden-age hip-hop sound, 1987",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 56.0,  "decay": 0.52}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.24, "tone": 0.38, "noise": 0.72}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.09}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.18, "spread": 0.45}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.055}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.035}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.38}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 55.0,  "decay": 0.30}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 70.0,  "decay": 0.24}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 88.0,  "decay": 0.18}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.3}},
        },
        "demo_bpm": 88,
        "demo": [
            # Golden-age hip-hop — Pete Rock / DJ Premier feel, late kicks
            [0.0,  36, 100, 0.5],
            [0.0,  42,  68, 0.2],
            [0.5,  42,  55, 0.2],
            [0.75, 36,  72, 0.3],   # double-time kick
            [1.0,  38,  95, 0.3],
            [1.0,  42,  68, 0.2],
            [1.5,  42,  55, 0.2],
            [2.0,  36, 100, 0.5],
            [2.0,  42,  68, 0.2],
            [2.25, 42,  52, 0.15],
            [2.5,  38,  62, 0.2],   # ghost snare
            [2.5,  42,  55, 0.2],
            [3.0,  38,  95, 0.3],
            [3.0,  42,  68, 0.2],
            [3.5,  42,  55, 0.2],
            [3.75, 36,  78, 0.3],   # late kick — SP-1200 laid-back feel
        ],
    },

    {
        "id": "hr16",
        "name": "Alesis HR-16",
        "category": "Classic",
        "description": "16-bit PCM punchy — industrial, alternative, NIN/Ministry, 1987",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 64.0,  "decay": 0.40}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.45, "noise": 0.65}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.09}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.16, "spread": 0.55}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.32}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 60.0,  "decay": 0.32}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 76.0,  "decay": 0.26}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 96.0,  "decay": 0.20}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.2}},
            55: {"synthdef": "cymbalSplash",  "params": {"decay": 0.5}},
        },
        "demo_bpm": 122,
        "demo": [
            # Industrial / alternative — NIN "Head Like a Hole" feel, 16th hat drive
            [0.0,  36, 100, 0.42],
            [0.0,  42,  72, 0.18],
            [0.25, 42,  55, 0.12],
            [0.5,  42,  65, 0.18],
            [0.75, 42,  52, 0.12],
            [1.0,  38,  95, 0.25],
            [1.0,  39,  88, 0.2],   # clap doubles snare
            [1.0,  42,  72, 0.18],
            [1.25, 42,  55, 0.12],
            [1.5,  36,  88, 0.38],
            [1.5,  42,  65, 0.18],
            [1.75, 42,  52, 0.12],
            [2.0,  36, 100, 0.42],
            [2.0,  42,  72, 0.18],
            [2.25, 42,  55, 0.12],
            [2.5,  42,  65, 0.18],
            [2.75, 42,  52, 0.12],
            [3.0,  38,  95, 0.25],
            [3.0,  39,  88, 0.2],   # clap doubles snare
            [3.0,  42,  72, 0.18],
            [3.25, 42,  55, 0.12],
            [3.5,  36,  82, 0.35],
            [3.5,  42,  65, 0.18],
            [3.75, 42,  52, 0.12],
        ],
    },

    {
        "id": "rx5",
        "name": "Yamaha RX5",
        "category": "Classic",
        "description": "12-bit crunchy PCM, 28 voices — Prince, Chromeo, 1986",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 68.0,  "decay": 0.48}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.26, "tone": 0.50, "noise": 0.60}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.10}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.20, "spread": 0.50}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.38}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 58.0,  "decay": 0.35}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 76.0,  "decay": 0.28}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 98.0,  "decay": 0.22}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.4}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.2}},
        },
        "demo_bpm": 112,
        "demo": [
            # 80s pop/funk fusion — slick, crunchy, midrange-forward
            [0.0,  36, 100, 0.5],
            [0.0,  42,  70, 0.2],
            [0.25, 42,  52, 0.15],
            [0.5,  42,  64, 0.2],
            [0.75, 42,  50, 0.15],
            [1.0,  38,  92, 0.28],
            [1.0,  39,  82, 0.22],  # clap stack
            [1.0,  42,  70, 0.2],
            [1.25, 42,  52, 0.15],
            [1.5,  36,  82, 0.38],
            [1.5,  42,  64, 0.2],
            [1.75, 42,  50, 0.15],
            [2.0,  36, 100, 0.5],
            [2.0,  42,  70, 0.2],
            [2.25, 42,  52, 0.15],
            [2.5,  42,  64, 0.2],
            [2.75, 46,  68, 0.4],   # open hat fill
            [3.0,  38,  92, 0.28],
            [3.0,  39,  82, 0.22],  # clap stack
            [3.0,  42,  70, 0.2],
            [3.25, 42,  52, 0.15],
            [3.5,  36,  78, 0.35],
            [3.75, 42,  50, 0.15],
        ],
    },

]
