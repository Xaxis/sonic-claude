"""
Acoustic & Live Drum Kits

Live performance and acoustic-emulation kits: Rock, Jazz, Funk, Latin,
R&B, and Brush styles. Tuned for realistic live-room character.

demo format: [beat, midi_note, velocity, duration_beats]
  beat          — position from bar start in quarter-note beats (0.0–3.999)
  midi_note     — GM note number (must exist in this kit's pads)
  velocity      — 0–127
  duration_beats — gate duration in beats (converted to seconds at playback time)
"""

KITS = [

    {
        "id": "rock-kit",
        "name": "Rock Kit",
        "category": "Acoustic",
        "description": "Acoustic kick/snare, ride-driven, live room",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 62.0,  "decay": 0.55}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.30, "tone": 0.55, "noise": 0.60}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.10}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.20, "spread": 0.40}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.065}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.48}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 60.0,  "decay": 0.38}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 76.0,  "decay": 0.30}},
            45: {"synthdef": "tomMid808",     "params": {"freq": 92.0,  "decay": 0.24}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 116.0, "decay": 0.18}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.8}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.5}},
            55: {"synthdef": "cymbalSplash",  "params": {"decay": 0.6}},
        },
        "demo_bpm": 115,
        "demo": [
            # Straight rock groove — kick/snare backbone, 8th-note hats, ride accent
            [0.0,  36, 100, 0.5],
            [0.0,  42,  75, 0.2],
            [0.5,  42,  60, 0.2],
            [1.0,  38,  95, 0.35],
            [1.0,  42,  75, 0.2],
            [1.5,  42,  60, 0.2],
            [2.0,  36, 100, 0.5],
            [2.0,  42,  75, 0.2],
            [2.5,  36,  72, 0.3],   # ghost kick
            [2.5,  42,  60, 0.2],
            [3.0,  38,  95, 0.35],
            [3.0,  51,  70, 0.4],   # ride accent on 4
            [3.5,  42,  58, 0.2],
        ],
    },

    {
        "id": "jazz-kit",
        "name": "Jazz Kit",
        "category": "Acoustic",
        "description": "Brush-style, soft, muted cymbals, ride",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.42}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.28, "tone": 0.65, "noise": 0.45}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.14}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.08}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.55}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 58.0,  "decay": 0.42}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 74.0,  "decay": 0.34}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 96.0,  "decay": 0.26}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 2.0}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.8}},
            55: {"synthdef": "cymbalSplash",  "params": {"decay": 0.8}},
        },
        "demo_bpm": 132,
        "demo": [
            # Jazz ride groove — ride-driven with hi-hat foot on 2 & 4, brush snare
            [0.0,  36,  65, 0.4],
            [0.0,  51,  75, 0.2],
            [0.5,  51,  55, 0.15],
            [0.75, 51,  65, 0.2],   # ride triplet swing
            [1.0,  44,  80, 0.1],   # hi-hat foot on 2
            [1.0,  51,  75, 0.2],
            [1.5,  51,  55, 0.15],
            [2.0,  36,  60, 0.35],
            [2.0,  51,  75, 0.2],
            [2.5,  51,  55, 0.15],
            [2.75, 51,  65, 0.2],   # ride triplet swing
            [3.0,  44,  80, 0.1],   # hi-hat foot on 4
            [3.0,  51,  75, 0.2],
            [3.5,  38,  70, 0.25],  # brush snare on "and-of-4"
        ],
    },

    {
        "id": "funk-kit",
        "name": "Funk Kit",
        "category": "Acoustic",
        "description": "Tight snare, popping rim, open hats",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 60.0,  "decay": 0.48}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.22, "tone": 0.45, "noise": 0.70}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.09}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.16, "spread": 0.50}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.055}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.035}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.42}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 60.0,  "decay": 0.32}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 78.0,  "decay": 0.26}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 98.0,  "decay": 0.20}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.4}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.1}},
        },
        "demo_bpm": 98,
        "demo": [
            # Classic funk — 16th-note grid, ghost snares, rimshot pop, open hat accent
            [0.0,  36, 100, 0.45],
            [0.0,  42,  70, 0.2],
            [0.25, 42,  50, 0.15],
            [0.5,  38,  55, 0.15],  # ghost snare
            [0.5,  42,  65, 0.2],
            [0.75, 42,  48, 0.15],
            [1.0,  38,  92, 0.3],   # snare beat 2
            [1.0,  42,  70, 0.2],
            [1.25, 37,  68, 0.1],   # rimshot pop
            [1.5,  36,  80, 0.35],  # kick on "and-of-2"
            [1.5,  42,  65, 0.2],
            [1.75, 42,  48, 0.15],
            [2.0,  42,  70, 0.2],
            [2.25, 42,  50, 0.15],
            [2.5,  38,  55, 0.15],  # ghost snare
            [2.5,  42,  65, 0.2],
            [3.0,  38,  92, 0.3],   # snare beat 4
            [3.0,  42,  70, 0.2],
            [3.25, 46,  72, 0.4],   # open hat accent
            [3.5,  36,  78, 0.3],   # kick "and-of-4"
            [3.75, 42,  50, 0.15],
        ],
    },

    {
        "id": "latin-kit",
        "name": "Latin Kit",
        "category": "Acoustic",
        "description": "Conga, bongo, timbale, cabasa forward",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 55.0,  "decay": 0.45}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.24, "tone": 0.40, "noise": 0.65}},
            60: {"synthdef": "tomHigh808",    "params": {"freq": 108.0, "decay": 0.20}},
            61: {"synthdef": "tomHigh808",    "params": {"freq": 128.0, "decay": 0.18}},
            64: {"synthdef": "tomMid808",     "params": {"freq": 82.0,  "decay": 0.24}},
            65: {"synthdef": "tomMid808",     "params": {"freq": 100.0, "decay": 0.18}},
            66: {"synthdef": "tomMid808",     "params": {"freq": 90.0,  "decay": 0.20}},
            69: {"synthdef": "hihatClosed808","params": {"decay": 0.10}},
            70: {"synthdef": "hihatClosed808","params": {"decay": 0.07}},
            56: {"synthdef": "cowbell808",    "params": {"freq": 500.0, "decay": 0.32}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.3}},
        },
        "demo_bpm": 110,
        "demo": [
            # Clave-driven Latin pattern — bongos + conga lead, shaker constant
            [0.0,  36,  90, 0.4],
            [0.0,  69,  65, 0.2],   # shaker
            [0.0,  64,  85, 0.2],   # lo conga
            [0.25, 69,  55, 0.15],
            [0.5,  61,  80, 0.2],   # lo bongo
            [0.5,  69,  65, 0.15],
            [0.75, 60,  88, 0.2],   # hi bongo
            [0.75, 69,  50, 0.15],
            [1.0,  38,  85, 0.3],
            [1.0,  69,  65, 0.2],
            [1.25, 64,  75, 0.2],   # lo conga
            [1.5,  56,  78, 0.25],  # cowbell accent
            [1.5,  69,  55, 0.15],
            [1.75, 61,  72, 0.2],   # lo bongo
            [2.0,  36,  90, 0.4],
            [2.0,  69,  65, 0.2],
            [2.0,  65,  82, 0.15],  # hi timbale
            [2.25, 69,  50, 0.15],
            [2.5,  61,  80, 0.2],   # lo bongo
            [2.5,  69,  65, 0.15],
            [2.75, 60,  90, 0.2],   # hi bongo accent
            [3.0,  56,  82, 0.25],  # cowbell
            [3.0,  69,  60, 0.2],
            [3.25, 64,  78, 0.2],   # lo conga
            [3.5,  66,  75, 0.15],  # lo timbale
            [3.75, 65,  82, 0.15],  # hi timbale
        ],
    },

    {
        "id": "rnb-kit",
        "name": "R&B Kit",
        "category": "Acoustic",
        "description": "Layered snare, warm kick, shaker-heavy",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 52.0,  "decay": 0.68}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.28, "tone": 0.55, "noise": 0.58}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.10}},
            39: {"synthdef": "clap808",       "params": {"decay": 0.22, "spread": 0.42}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.07}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.045}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.45}},
            69: {"synthdef": "hihatClosed808","params": {"decay": 0.09}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 54.0,  "decay": 0.36}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 70.0,  "decay": 0.28}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 90.0,  "decay": 0.22}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.6}},
        },
        "demo_bpm": 92,
        "demo": [
            # Soulful R&B — 16th hi-hat + shaker, snare/clap stack on 2 & 4
            [0.0,  36, 100, 0.55],
            [0.0,  42,  68, 0.2],
            [0.0,  69,  60, 0.15],  # shaker
            [0.25, 42,  52, 0.15],
            [0.5,  42,  65, 0.2],
            [0.5,  69,  58, 0.15],
            [0.75, 42,  48, 0.15],
            [1.0,  38,  90, 0.3],
            [1.0,  39,  82, 0.25],  # clap doubles snare
            [1.0,  42,  68, 0.2],
            [1.25, 42,  52, 0.15],
            [1.5,  36,  78, 0.4],   # ghost kick "and-of-2"
            [1.5,  42,  65, 0.2],
            [1.75, 42,  48, 0.15],
            [2.0,  36, 100, 0.55],
            [2.0,  42,  68, 0.2],
            [2.25, 42,  52, 0.15],
            [2.5,  42,  65, 0.2],
            [2.75, 46,  72, 0.4],   # open hat accent before 4
            [3.0,  38,  90, 0.3],
            [3.0,  39,  82, 0.25],  # clap doubles snare
            [3.0,  42,  68, 0.2],
            [3.25, 42,  52, 0.15],
            [3.5,  42,  65, 0.2],
            [3.75, 42,  48, 0.15],
        ],
    },

    {
        "id": "brush-kit",
        "name": "Brush Kit",
        "category": "Acoustic",
        "description": "Acoustic, soft, sparse — minimal attack",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 56.0,  "decay": 0.50}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.35, "tone": 0.70, "noise": 0.40}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.09}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.60}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 56.0,  "decay": 0.45}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 72.0,  "decay": 0.36}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 92.0,  "decay": 0.28}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 2.2}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 2.0}},
        },
        "demo_bpm": 78,
        "demo": [
            # Gentle brush groove — sparse, swung ride, soft touches
            [0.0,  36,  72, 0.5],
            [0.0,  51,  65, 0.3],   # ride beat 1
            [0.5,  51,  48, 0.2],   # ride "and-of-1"
            [1.0,  38,  80, 0.35],  # brush snare beat 2
            [1.0,  44,  75, 0.1],   # hi-hat foot on 2
            [1.0,  51,  65, 0.3],   # ride beat 2
            [1.5,  51,  48, 0.2],   # ride "and-of-2"
            [2.0,  36,  68, 0.45],
            [2.0,  51,  65, 0.3],   # ride beat 3
            [2.5,  51,  48, 0.2],   # ride "and-of-3"
            [2.75, 46,  60, 0.5],   # open hat swish
            [3.0,  38,  78, 0.35],  # brush snare beat 4
            [3.0,  44,  70, 0.1],   # hi-hat foot on 4
            [3.0,  51,  65, 0.3],   # ride beat 4
            [3.5,  51,  50, 0.2],   # ride "and-of-4"
        ],
    },

    {
        "id": "samba",
        "name": "Samba / Batucada",
        "category": "Acoustic",
        "description": "Brazilian samba percussion — surdo pulse, caixa 16ths, tamborim syncopation",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.40}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.18, "tone": 0.42, "noise": 0.70}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.08}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.035}},
            64: {"synthdef": "tomMid808",     "params": {"freq": 72.0,  "decay": 0.28}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 0.9}},
        },
        "demo_bpm": 140,
        "demo": [
            # Samba batucada — surdo de segunda beats 1&3, surdo de primeira beats 2&4
            # caixa 16th-note grid, tamborim syncopation, shaker constant
            [0.0,  36, 100, 0.35],  # surdo de segunda (downbeat 1)
            [0.0,  42,  70, 0.15],  # shaker (pandeiro)
            [0.0,  37,  85, 0.12],  # tamborim attack
            [0.25, 42,  55, 0.12],
            [0.25, 38,  68, 0.12],  # caixa ghost
            [0.5,  42,  65, 0.15],
            [0.5,  37,  80, 0.12],  # tamborim accent
            [0.75, 42,  55, 0.12],
            [0.75, 38,  78, 0.15],  # caixa accent
            [1.0,  64,  90, 0.3],   # surdo de primeira (beat 2 — the "response")
            [1.0,  42,  70, 0.15],
            [1.0,  38,  68, 0.12],
            [1.25, 42,  55, 0.12],
            [1.25, 37,  82, 0.12],  # tamborim synco before beat 3
            [1.5,  42,  65, 0.15],
            [1.5,  38,  75, 0.15],
            [1.75, 42,  55, 0.12],
            [1.75, 37,  78, 0.12],  # tamborim anticipation
            [2.0,  36,  95, 0.35],  # surdo de segunda (downbeat 3)
            [2.0,  42,  70, 0.15],
            [2.0,  38,  80, 0.15],
            [2.25, 42,  55, 0.12],
            [2.25, 37,  85, 0.12],  # tamborim
            [2.5,  42,  65, 0.15],
            [2.5,  38,  70, 0.12],
            [2.75, 42,  55, 0.12],
            [2.75, 38,  78, 0.15],
            [3.0,  64,  90, 0.3],   # surdo de primeira (beat 4)
            [3.0,  42,  70, 0.15],
            [3.0,  37,  82, 0.12],  # tamborim
            [3.25, 42,  55, 0.12],
            [3.25, 38,  68, 0.12],
            [3.5,  42,  65, 0.15],
            [3.5,  37,  80, 0.15],  # tamborim
            [3.75, 42,  55, 0.12],
            [3.75, 38,  88, 0.15],  # anticipation into beat 1
        ],
    },

    {
        "id": "bossa-nova",
        "name": "Bossa Nova",
        "category": "Acoustic",
        "description": "3-2 clave cross-stick, surdo kick, steady ride — João Gilberto style",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 55.0,  "decay": 0.42}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.14}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.07}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.05}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.30}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.5}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.8}},
        },
        "demo_bpm": 95,
        "demo": [
            # Bossa Nova — 3-2 clave on cross-stick (rimshot37), surdo kick 1&3
            # Ride 16ths, hi-hat foot on 2 & 4 — relaxed, floating, syncopated
            [0.0,  36,  75, 0.45],  # surdo (kick) beat 1
            [0.0,  51,  65, 0.2],   # ride beat 1
            [0.0,  37,  80, 0.15],  # clave hit 1
            [0.25, 51,  48, 0.15],  # ride "e"
            [0.5,  51,  60, 0.2],   # ride "and"
            [0.75, 37,  80, 0.15],  # clave hit 2 ("and-of-2")
            [0.75, 51,  48, 0.15],  # ride "a"
            [1.0,  51,  65, 0.2],   # ride beat 2
            [1.0,  44,  72, 0.1],   # hi-hat foot on 2
            [1.25, 51,  48, 0.15],
            [1.5,  37,  80, 0.15],  # clave hit 3 ("and-of-3")
            [1.5,  51,  60, 0.2],
            [1.75, 51,  48, 0.15],
            [2.0,  36,  70, 0.4],   # surdo beat 3
            [2.0,  51,  65, 0.2],
            [2.0,  37,  78, 0.15],  # clave hit 4 (bar 2, beat 1)
            [2.25, 51,  48, 0.15],
            [2.5,  37,  78, 0.15],  # clave hit 5 ("and-of-4" = the "2" side)
            [2.5,  51,  60, 0.2],
            [2.75, 51,  48, 0.15],
            [3.0,  51,  65, 0.2],   # ride beat 4
            [3.0,  44,  72, 0.1],   # hi-hat foot on 4
            [3.25, 51,  48, 0.15],
            [3.5,  51,  60, 0.2],
            [3.75, 51,  48, 0.15],
        ],
    },

    {
        "id": "reggae-one-drop",
        "name": "Reggae One-Drop",
        "category": "Acoustic",
        "description": "Beat 1 empty (the drop), kick+snare only on beat 3 — Carlton Barrett style",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 58.0,  "decay": 0.70}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.32, "tone": 0.62, "noise": 0.48}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.14}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.06}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.50}},
            51: {"synthdef": "cymbalRide",    "params": {"decay": 1.6}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 2.0}},
        },
        "demo_bpm": 85,
        "demo": [
            # One-Drop — beat 1 is EMPTY (the "drop"), kick+snare land on beat 3 only
            # Open hats on offbeats simulate guitar "skank" chops on 2 & 4
            [0.0,  42,  48, 0.2],   # faint hat — beat 1 has NO kick (the "drop")
            [0.5,  46,  60, 0.4],   # open hat "and-of-1"
            [1.0,  42,  50, 0.2],   # hat beat 2
            [1.5,  46,  68, 0.45],  # open hat "and-of-2" — guitar skank feel
            [2.0,  36, 100, 0.6],   # THE ONE-DROP: kick on beat 3
            [2.0,  38,  95, 0.45],  # snare simultaneous with kick
            [2.0,  42,  55, 0.2],   # hat
            [2.5,  46,  62, 0.35],  # open hat "and-of-3"
            [3.0,  42,  50, 0.2],   # hat beat 4
            [3.5,  46,  65, 0.4],   # open hat "and-of-4"
        ],
    },

    {
        "id": "metal",
        "name": "Metal / Blast Beat",
        "category": "Acoustic",
        "description": "Blast beat — every 8th note synchronized at 175 BPM, death metal style",
        "pads": {
            36: {"synthdef": "kick808",       "params": {"freq": 65.0,  "decay": 0.30}},
            38: {"synthdef": "snare808",      "params": {"decay": 0.15, "tone": 0.22, "noise": 0.92}},
            37: {"synthdef": "rimshot808",    "params": {"decay": 0.06}},
            42: {"synthdef": "hihatClosed808","params": {"decay": 0.04}},
            44: {"synthdef": "hihatClosed808","params": {"decay": 0.025}},
            46: {"synthdef": "hihatOpen808",  "params": {"decay": 0.20}},
            41: {"synthdef": "tomLow808",     "params": {"freq": 55.0,  "decay": 0.28}},
            43: {"synthdef": "tomMid808",     "params": {"freq": 72.0,  "decay": 0.22}},
            45: {"synthdef": "tomMid808",     "params": {"freq": 88.0,  "decay": 0.18}},
            48: {"synthdef": "tomHigh808",    "params": {"freq": 108.0, "decay": 0.14}},
            49: {"synthdef": "cymbalCrash",   "params": {"decay": 1.0}},
        },
        "demo_bpm": 175,
        "demo": [
            # Blast beat — kick + snare + cymbal on every 8th note (8 hits per bar)
            # Starts with crash, ends with double tom fill
            [0.0,  36, 100, 0.25],
            [0.0,  38,  95, 0.22],
            [0.0,  49,  85, 0.2],   # crash on beat 1
            [0.5,  36,  92, 0.22],
            [0.5,  38,  88, 0.2],
            [0.5,  42,  80, 0.18],
            [1.0,  36, 100, 0.25],
            [1.0,  38,  95, 0.22],
            [1.0,  42,  80, 0.18],
            [1.5,  36,  92, 0.22],
            [1.5,  38,  88, 0.2],
            [1.5,  42,  80, 0.18],
            [2.0,  36, 100, 0.25],
            [2.0,  38,  95, 0.22],
            [2.0,  42,  80, 0.18],
            [2.5,  36,  92, 0.22],
            [2.5,  38,  88, 0.2],
            [2.5,  42,  80, 0.18],
            [3.0,  36, 100, 0.25],
            [3.0,  38,  95, 0.22],  # snare + kick continue
            [3.0,  48,  90, 0.18],  # high tom — fill begins
            [3.5,  36,  92, 0.22],
            [3.5,  45,  88, 0.2],   # mid tom
            [3.5,  43,  85, 0.22],  # floor tom
        ],
    },

]
