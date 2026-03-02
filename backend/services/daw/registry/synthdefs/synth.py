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
]
