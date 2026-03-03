"""
Electronic Synthesizer SynthDefs

Corresponds to: backend/supercollider/synthdefs/instruments.scd (advanced synth section)

These are the programmable synth engines: FM, subtractive, physical modeling.
Categories: Synth, Bass (synthetic), Lead, Keys.
"""

_MELODIC_PARAMS = ["freq", "amp", "gate", "attack", "release"]

SYNTHDEFS = [
    {"name": "fm",    "display_name": "FM Synth",   "category": "Synth", "description": "Frequency modulation synthesizer",   "parameters": ["freq", "amp", "gate", "attack", "release", "modIndex", "modRatio"]},
    {"name": "pad",   "display_name": "Pad Synth",  "category": "Synth", "description": "Warm pad synthesizer",               "parameters": ["freq", "amp", "gate", "attack", "release", "detune"]},
    {"name": "bass",  "display_name": "Bass Synth", "category": "Bass",  "description": "Deep bass synthesizer",              "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "lead",  "display_name": "Lead Synth", "category": "Lead",  "description": "Bright lead synthesizer",            "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "pluck", "display_name": "Pluck Synth","category": "Synth", "description": "Plucked string synthesizer",         "parameters": ["freq", "amp", "gate", "attack", "release", "decay"]},
    {"name": "bell",  "display_name": "Bell",       "category": "Synth", "description": "Bell-like synthesizer",              "parameters": ["freq", "amp", "gate", "attack", "release"]},
    {"name": "organ",     "display_name": "Organ",          "category": "Keys",  "description": "Hammond-style organ",                         "parameters": ["freq", "amp", "gate", "attack", "release", "drawbar1", "drawbar2"]},

    # Extended synths
    {"name": "supersaw",  "display_name": "Supersaw",       "category": "Lead",  "description": "JP-8000 style 7-oscillator supersaw",         "parameters": ["freq", "amp", "gate", "attack", "release", "detune", "cutoff"]},
    {"name": "acidbass",  "display_name": "Acid Bass",      "category": "Bass",  "description": "TB-303 squelchy resonant bass",               "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "resonance", "envMod"]},
    {"name": "reese",     "display_name": "Reese Bass",     "category": "Bass",  "description": "Detuned saw bass, DnB/techno classic",        "parameters": ["freq", "amp", "gate", "attack", "release", "detune", "cutoff"]},
    {"name": "wobble",    "display_name": "Wobble Bass",    "category": "Bass",  "description": "LFO filter sweep bass",                       "parameters": ["freq", "amp", "gate", "attack", "release", "lfoRate", "cutoff"]},
    {"name": "stab",      "display_name": "Stab Synth",     "category": "Synth", "description": "Short punchy chord stab",                    "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "detune"]},
    {"name": "glide",     "display_name": "Glide Lead",     "category": "Lead",  "description": "Portamento monophonic lead with Lag.kr",      "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "glideTime"]},
    {"name": "chiptune",  "display_name": "Chiptune",       "category": "Synth", "description": "8-bit pulse wave synthesizer",               "parameters": ["freq", "amp", "gate", "attack", "release", "width"]},
    {"name": "strings",   "display_name": "Strings",        "category": "Pad",   "description": "Lush 6-voice detuned string ensemble",        "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "ensemble"]},
    {"name": "brass",     "display_name": "Brass Stab",     "category": "Synth", "description": "Filter-envelope brass stab",                 "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "brightness"]},
    {"name": "kalimba",   "display_name": "Kalimba",        "category": "Keys",  "description": "Thumb piano with inharmonic partials",        "parameters": ["freq", "amp", "gate", "attack", "release"]},
    {"name": "glass",     "display_name": "Glass Harmonica","category": "Keys",  "description": "Ethereal glass bowl with shimmer LFO",        "parameters": ["freq", "amp", "gate", "attack", "release"]},

    # ── Synth ──────────────────────────────────────────────────────────────────
    {"name": "duo",          "display_name": "Duo",           "category": "Synth", "description": "Dual detuned oscillators",                          "parameters": ["freq", "amp", "gate", "attack", "release", "detune", "cutoff"]},
    {"name": "pwm",          "display_name": "PWM Synth",     "category": "Synth", "description": "Pulse width modulation with LFO sweep",             "parameters": ["freq", "amp", "gate", "attack", "release", "lfoRate", "cutoff"]},
    {"name": "hoover",       "display_name": "Hoover",        "category": "Synth", "description": "Classic rave hoover with glide",                    "parameters": ["freq", "amp", "gate", "attack", "release", "detune", "cutoff", "glideTime"]},
    {"name": "polyBrass",    "display_name": "Poly Brass",    "category": "Synth", "description": "Polysynth brass with filter envelope",              "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "brightness"]},
    {"name": "fmBell",       "display_name": "FM Bell",       "category": "Synth", "description": "Yamaha DX-style FM bell",                           "parameters": ["freq", "amp", "gate", "attack", "release", "modRatio", "modIndex"]},
    {"name": "fmVibes",      "display_name": "FM Vibraphone", "category": "Synth", "description": "FM vibraphone with vibrato",                        "parameters": ["freq", "amp", "gate", "attack", "release", "modRatio", "vibRate"]},
    {"name": "bowedStr",     "display_name": "Bowed String",  "category": "Synth", "description": "Physical model bowed string via resonant delay",    "parameters": ["freq", "amp", "gate", "attack", "release", "bowPressure", "cutoff"]},
    {"name": "metalKlank",   "display_name": "Metal Klank",   "category": "Synth", "description": "Metallic resonant bank of partials",               "parameters": ["freq", "amp", "gate", "attack", "release"]},
    {"name": "nylonStr",     "display_name": "Nylon String",  "category": "Synth", "description": "Karplus-Strong nylon guitar model",                 "parameters": ["freq", "amp", "gate", "attack", "release"]},

    # ── Bass ───────────────────────────────────────────────────────────────────
    {"name": "fmBass",       "display_name": "FM Bass",       "category": "Bass",  "description": "FM synthesis bass with decaying modulator",         "parameters": ["freq", "amp", "gate", "attack", "release", "modRatio", "modIndex"]},
    {"name": "moogBass",     "display_name": "Moog Bass",     "category": "Bass",  "description": "Cascaded RLPF simulating Moog ladder filter",       "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "resonance"]},
    {"name": "darkBass",     "display_name": "Dark Bass",     "category": "Bass",  "description": "Sub bass with detuned saws",                        "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "detune"]},
    {"name": "punchBass",    "display_name": "Punch Bass",    "category": "Bass",  "description": "Hard attack bass with fast filter sweep",            "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "dubBass",      "display_name": "Dub Bass",      "category": "Bass",  "description": "Reggae/dub sine-dominant bass",                     "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "subBass",      "display_name": "Sub Bass",      "category": "Bass",  "description": "Pure sine sub bass with optional soft drive",       "parameters": ["freq", "amp", "gate", "attack", "release", "drive"]},
    {"name": "squareBass",   "display_name": "Square Bass",   "category": "Bass",  "description": "Square wave bass with low-pass filter",             "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "width"]},

    # ── Lead ───────────────────────────────────────────────────────────────────
    {"name": "analogLead",   "display_name": "Analog Lead",   "category": "Lead",  "description": "Classic detuned mono lead",                         "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "resonance", "detune"]},
    {"name": "squareLead",   "display_name": "Square Lead",   "category": "Lead",  "description": "Square wave lead synth",                            "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "width"]},
    {"name": "fmLead",       "display_name": "FM Lead",       "category": "Lead",  "description": "FM synthesis lead synth",                           "parameters": ["freq", "amp", "gate", "attack", "release", "modRatio", "modIndex"]},
    {"name": "buzzLead",     "display_name": "Buzz Lead",     "category": "Lead",  "description": "Rich harmonic lead using Blip oscillator",           "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "harmonics"]},

    # ── Pad ────────────────────────────────────────────────────────────────────
    {"name": "warmPad",      "display_name": "Warm Pad",      "category": "Pad",   "description": "Slow-attack detuned saw pad",                       "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "detune"]},
    {"name": "junoPad",      "display_name": "Juno Pad",      "category": "Pad",   "description": "Juno-106 style stereo chorus pad",                  "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "chorusDepth"]},
    {"name": "choirPad",     "display_name": "Choir Pad",     "category": "Pad",   "description": "Vowel formant choir pad",                           "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "vowel"]},
    {"name": "spacePad",     "display_name": "Space Pad",     "category": "Pad",   "description": "Ambient shimmer pad with LFO drift",                "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "shimmer"]},
    {"name": "dreamPad",     "display_name": "Dream Pad",     "category": "Pad",   "description": "Harmonic series pad with per-voice drift",           "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "drift"]},
    {"name": "atmospherePad","display_name": "Atmosphere",    "category": "Pad",   "description": "Dark textural pad with noise layer",                 "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "loPad",        "display_name": "Lo-fi Pad",     "category": "Pad",   "description": "Filtered vintage pad with bit reduction",            "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff", "bitCrush"]},

    # ── Keys ───────────────────────────────────────────────────────────────────
    {"name": "rhodes",       "display_name": "Rhodes",        "category": "Keys",  "description": "FM electric piano (Rhodes-style)",                  "parameters": ["freq", "amp", "gate", "attack", "release", "tone"]},
    {"name": "wurli",        "display_name": "Wurlitzer",     "category": "Keys",  "description": "Wurlitzer electric piano with transient bark",       "parameters": ["freq", "amp", "gate", "attack", "release", "bark"]},
    {"name": "claviSynth",   "display_name": "Clavi Synth",   "category": "Keys",  "description": "Clavinet-style clicky keyboard",                    "parameters": ["freq", "amp", "gate", "attack", "release", "cutoff"]},
    {"name": "tubeBell",     "display_name": "Tube Bell",     "category": "Keys",  "description": "Tubular bells with accurate harmonic partials",      "parameters": ["freq", "amp", "gate", "attack", "release"]},
    {"name": "fmEpiano",     "display_name": "FM E-Piano",    "category": "Keys",  "description": "DX7-style FM electric piano with feedback",          "parameters": ["freq", "amp", "gate", "attack", "release", "modIndex", "feedback"]},
]
