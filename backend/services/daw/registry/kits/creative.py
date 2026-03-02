"""
Creative & Textured Drum Kits

Experimental, hyper-processed, and atmospheric kits for producers
who want character beyond standard machine presets.

demo format: [beat, midi_note, velocity, duration_beats]
  beat          — position from bar start in quarter-note beats (0.0–3.999)
  midi_note     — GM note number (must exist in this kit's pads)
  velocity      — 0–127
  duration_beats — gate duration in beats (converted to seconds at playback time)
"""

KITS = [

    {
        "id": "hot-rod",
        "name": "Hot Rod Kit",
        "category": "Creative",
        "description": "Hyper-processed, saturated, punchy extreme",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 44.0,  "decay": 1.0}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.18, "tone": 0.20, "noise": 0.95}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.06}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.14, "spread": 0.75}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.02}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.22}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 44.0,  "decay": 0.55}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 58.0,  "decay": 0.42}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 74.0,  "decay": 0.30}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.2}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 900.0, "decay": 0.18}},
        },
        "demo_bpm": 130,
        "demo": [
            # Hyper-punchy kick-heavy groove — machine-gun hats, stacked snare/clap
            [0.0,  36, 127, 0.5],
            [0.0,  42,  80, 0.15],
            [0.25, 42,  65, 0.15],
            [0.5,  42,  72, 0.15],
            [0.75, 36,  85, 0.3],   # ghost kick
            [0.75, 42,  58, 0.15],
            [1.0,  38, 110, 0.25],
            [1.0,  39, 100, 0.2],   # clap stack
            [1.0,  42,  80, 0.15],
            [1.25, 42,  65, 0.15],
            [1.5,  36, 100, 0.4],
            [1.5,  42,  72, 0.15],
            [1.75, 42,  58, 0.15],
            [2.0,  36, 127, 0.5],
            [2.0,  42,  80, 0.15],
            [2.0,  56,  88, 0.2],   # cowbell
            [2.25, 42,  65, 0.15],
            [2.5,  42,  72, 0.15],
            [2.75, 36,  80, 0.3],   # ghost kick
            [2.75, 42,  58, 0.15],
            [3.0,  38, 110, 0.25],
            [3.0,  39, 100, 0.2],   # clap stack
            [3.0,  42,  80, 0.15],
            [3.25, 42,  65, 0.15],
            [3.5,  36, 110, 0.4],
            [3.5,  42,  72, 0.15],
            [3.75, 42,  58, 0.15],
        ],
    },

    {
        "id": "coma-kit",
        "name": "Coma Kit",
        "category": "Creative",
        "description": "Dark, heavy, slow decay, industrial feel",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 38.0,  "decay": 1.40}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.45, "tone": 0.30, "noise": 0.80}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.16}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.35, "spread": 0.30}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.10}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.07}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.70}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 40.0,  "decay": 0.70}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 52.0,  "decay": 0.55}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 66.0,  "decay": 0.40}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 2.5}},
        },
        "demo_bpm": 65,
        "demo": [
            # Slow and heavy — massive kick, long decay everything, open hat swell
            [0.0,  36, 110, 0.8],
            [0.0,  42,  75, 0.3],
            [0.5,  42,  55, 0.25],
            [1.0,  38,  95, 0.5],
            [1.0,  39,  85, 0.4],   # clap stack
            [1.0,  42,  70, 0.3],
            [1.5,  42,  50, 0.25],
            [2.0,  36, 110, 0.8],
            [2.0,  42,  70, 0.3],
            [2.25, 36,  78, 0.4],   # ghost kick
            [2.5,  46,  80, 0.6],   # open hat swell
            [3.0,  38,  95, 0.5],
            [3.0,  39,  85, 0.4],   # clap stack
            [3.0,  42,  70, 0.3],
            [3.5,  42,  50, 0.25],
        ],
    },

    {
        "id": "minimal-kit",
        "name": "Minimal Kit",
        "category": "Creative",
        "description": "Sparse, stripped down, clicks and tones",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 70.0,  "decay": 0.20}},
            38: {"synthdef": "rimshot808",    "params": {"decay": 0.08}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.10, "spread": 0.80}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.15}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 660.0, "decay": 0.14}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 0.8}},
        },
        "demo_bpm": 125,
        "demo": [
            # Stripped-down minimal techno — each element deliberate
            [0.0,  36,  95, 0.35],
            [0.0,  42,  60, 0.15],
            [0.5,  42,  45, 0.12],
            [1.0,  39,  85, 0.15],  # clap beat 2
            [1.0,  42,  60, 0.15],
            [1.5,  42,  45, 0.12],
            [1.75, 56,  70, 0.2],   # cowbell click
            [2.0,  36,  95, 0.35],
            [2.0,  42,  60, 0.15],
            [2.5,  42,  45, 0.12],
            [3.0,  39,  85, 0.15],  # clap beat 4
            [3.0,  42,  60, 0.15],
            [3.25, 36,  72, 0.2],   # ghost kick
            [3.5,  42,  45, 0.12],
            [3.5,  46,  65, 0.3],   # open click
        ],
    },

    {
        "id": "industrial",
        "name": "Industrial Kit",
        "category": "Creative",
        "description": "Harsh noise layers, metallic character",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 42.0,  "decay": 0.80}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.15, "tone": 0.10, "noise": 1.0}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.05}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.12, "spread": 0.85}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.02}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.18}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 42.0,  "decay": 0.60}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 56.0,  "decay": 0.45}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 72.0,  "decay": 0.32}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 1000.0,"decay": 0.14}},
        },
        "demo_bpm": 142,
        "demo": [
            # Machine-like industrial stomp — every-beat hat, harsh clap/snare stack
            [0.0,  36, 120, 0.45],
            [0.0,  42,  88, 0.12],
            [0.25, 42,  72, 0.1],
            [0.5,  42,  80, 0.12],
            [0.75, 42,  65, 0.1],
            [1.0,  38, 100, 0.2],
            [1.0,  39,  92, 0.18],  # harsh clap
            [1.0,  42,  88, 0.12],
            [1.25, 42,  72, 0.1],
            [1.5,  36, 110, 0.4],
            [1.5,  42,  80, 0.12],
            [1.75, 42,  65, 0.1],
            [2.0,  36, 120, 0.45],
            [2.0,  56, 100, 0.15],  # metal cowbell
            [2.0,  42,  88, 0.12],
            [2.25, 42,  72, 0.1],
            [2.5,  42,  80, 0.12],
            [2.75, 36,  90, 0.3],   # extra kick
            [2.75, 42,  65, 0.1],
            [3.0,  38, 100, 0.2],
            [3.0,  39,  92, 0.18],  # harsh clap
            [3.0,  42,  88, 0.12],
            [3.25, 42,  72, 0.1],
            [3.5,  42,  80, 0.12],
            [3.75, 42,  65, 0.1],
        ],
    },

    {
        "id": "ambient-perc",
        "name": "Ambient Percussion",
        "category": "Creative",
        "description": "Long decay, sparse, textural",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 45.0,  "decay": 1.80}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.60, "tone": 0.70, "noise": 0.50}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.15}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 1.20}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 46.0,  "decay": 1.0}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 60.0,  "decay": 0.80}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 76.0,  "decay": 0.60}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 3.5}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 3.0}},
            55: {"synthdef": "cymbalSplash",  "params": {"decay": 1.5}},
        },
        "demo_bpm": 72,
        "demo": [
            # Sparse ambient — only essential hits, long decays create texture
            [0.0,  36,  85, 1.2],   # deep kick swell
            [0.0,  51,  55, 0.5],   # soft ride
            [1.0,  46,  70, 0.8],   # long open hat
            [1.5,  43,  60, 0.5],   # tom mid swirl
            [2.0,  38,  78, 0.6],   # snare bloom
            [2.0,  49,  65, 2.0],   # long crash swell
            [2.5,  41,  58, 0.6],   # tom low
            [3.0,  51,  60, 0.4],   # ride tick
            [3.5,  48,  55, 0.4],   # high tom drop
        ],
    },

    {
        "id": "world-fusion",
        "name": "World Fusion Kit",
        "category": "Creative",
        "description": "Ethnic + electronic blend",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 55.0,  "decay": 0.65}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.26, "tone": 0.50, "noise": 0.60}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.11}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.20, "spread": 0.40}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.40}},
            60: {"synthdef": "tomHigh808",    "params": {"freq": 106.0, "decay": 0.22}},
            61: {"synthdef": "tomHigh808",    "params": {"freq": 125.0, "decay": 0.18}},
            64: {"synthdef": "tomMid808",     "params": {"freq": 80.0,  "decay": 0.26}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 510.0, "decay": 0.30}},
            69: {"synthdef": "hihatClosed808","params": {"decay": 0.09}},
            70: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.4}},
        },
        "demo_bpm": 116,
        "demo": [
            # Polyrhythmic world groove — bongos over kick/snare, shaker + maracas grid
            [0.0,  36,  90, 0.45],
            [0.0,  60,  80, 0.2],   # hi bongo
            [0.0,  69,  60, 0.15],  # shaker
            [0.25, 61,  75, 0.2],   # lo bongo
            [0.25, 70,  55, 0.15],  # maracas
            [0.5,  64,  82, 0.22],  # lo conga
            [0.5,  69,  58, 0.15],
            [0.75, 60,  85, 0.2],   # hi bongo
            [1.0,  38,  88, 0.3],
            [1.0,  42,  65, 0.18],
            [1.0,  69,  60, 0.15],
            [1.25, 61,  72, 0.2],   # lo bongo
            [1.5,  56,  75, 0.25],  # cowbell
            [1.5,  64,  78, 0.2],   # lo conga
            [1.5,  70,  55, 0.15],  # maracas
            [1.75, 60,  80, 0.2],   # hi bongo
            [2.0,  36,  90, 0.45],
            [2.0,  61,  76, 0.2],   # lo bongo
            [2.0,  69,  60, 0.15],
            [2.25, 64,  80, 0.2],   # lo conga
            [2.5,  60,  88, 0.2],   # hi bongo accent
            [2.5,  46,  70, 0.4],   # open hat
            [2.75, 61,  72, 0.2],   # lo bongo
            [3.0,  38,  88, 0.3],
            [3.0,  56,  80, 0.25],  # cowbell
            [3.0,  69,  60, 0.15],
            [3.25, 64,  78, 0.2],   # lo conga
            [3.5,  60,  82, 0.2],   # hi bongo
            [3.75, 61,  75, 0.2],   # lo bongo
        ],
    },

    {
        "id": "future-bass",
        "name": "Future Bass",
        "category": "Creative",
        "description": "32nd-note hi-hat swells, punchy kicks, snare/clap stack, 140–160 BPM",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 52.0,  "decay": 0.42}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.35, "noise": 0.72}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.18, "spread": 0.55}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.28}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
            55: {"synthdef": "cymbalSplash",  "params": {"decay": 0.4}},
        },
        "demo_bpm": 150,
        "demo": [
            # Future Bass — 32nd-note hat velocity swell into snare/clap on 2 & 4
            [0.0,   36, 110, 0.4],
            [0.0,   42,  80, 0.1],
            [0.125, 42,  65, 0.08],  # 32nd hat swell starts (velocities climbing)
            [0.25,  42,  72, 0.1],
            [0.375, 42,  78, 0.09],
            [0.5,   42,  82, 0.1],
            [0.625, 42,  88, 0.1],   # swell peaks
            [0.75,  42,  92, 0.12],
            [0.875, 42,  72, 0.1],   # break before snare
            [1.0,   38, 100, 0.22],  # snare + clap on 2
            [1.0,   39,  90, 0.18],
            [1.0,   42,  78, 0.12],
            [1.25,  42,  60, 0.1],
            [1.5,   36,  90, 0.35],
            [1.5,   42,  68, 0.1],
            [1.75,  42,  75, 0.12],
            [2.0,   36, 110, 0.4],
            [2.0,   42,  80, 0.1],
            [2.125, 42,  65, 0.08],  # 32nd hat swell again
            [2.25,  42,  72, 0.1],
            [2.375, 42,  78, 0.09],
            [2.5,   42,  82, 0.1],
            [2.625, 42,  88, 0.1],
            [2.75,  42,  92, 0.12],
            [2.875, 42,  72, 0.1],
            [3.0,   38, 100, 0.22],  # snare + clap on 4
            [3.0,   39,  90, 0.18],
            [3.0,   42,  78, 0.12],
            [3.25,  42,  60, 0.1],
            [3.5,   36,  90, 0.35],
            [3.5,   42,  68, 0.1],
            [3.75,  42,  75, 0.12],
        ],
    },

    {
        "id": "glitch",
        "name": "Glitch Kit",
        "category": "Creative",
        "description": "Off-grid, stutters, unexpected gaps — calculated disorder at 110 BPM",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 68.0,  "decay": 0.28}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.16, "tone": 0.28, "noise": 0.84}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.07}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.13, "spread": 0.78}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.03}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.02}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.18}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 52.0,  "decay": 0.35}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 82.0,  "decay": 0.22}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 0.8}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 750.0, "decay": 0.12}},
        },
        "demo_bpm": 110,
        "demo": [
            # Glitch — off-grid stutters, early/late hits, deliberate metric confusion
            [0.0,   36, 100, 0.3],
            [0.125, 36,  72, 0.15],  # stutter double
            [0.0,   42,  75, 0.12],
            [0.375, 42,  55, 0.1],
            [0.625, 38,  88, 0.2],   # snare lands EARLY (should be beat 1.0)
            [0.75,  42,  62, 0.1],
            [1.125, 36,  85, 0.25],  # kick lands LATE
            [1.25,  42,  68, 0.12],
            [1.375, 36,  72, 0.18],  # stutter
            [1.625, 38,  80, 0.18],  # snare off-grid
            [1.875, 42,  55, 0.1],
            [2.0,   36, 100, 0.3],
            [2.125, 36,  68, 0.15],  # stutter
            [2.25,  42,  72, 0.12],
            [2.5,   38,  90, 0.22],
            [2.625, 42,  55, 0.1],
            [2.75,  36,  78, 0.2],
            [2.875, 36,  65, 0.15],  # stutter
            [3.0,   42,  68, 0.12],
            [3.125, 38,  75, 0.18],
            [3.375, 42,  55, 0.1],
            [3.5,   36,  92, 0.25],
            [3.625, 36,  70, 0.15],  # stutter
            [3.875, 38,  85, 0.2],   # snare anticipation into bar 2
        ],
    },

]
