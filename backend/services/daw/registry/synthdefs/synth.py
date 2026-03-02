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
    {"name": "organ", "display_name": "Organ",      "category": "Keys",  "description": "Hammond-style organ",                "parameters": ["freq", "amp", "gate", "attack", "release", "drawbar1", "drawbar2"]},
]
