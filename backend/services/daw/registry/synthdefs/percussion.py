"""
Latin & World Percussion SynthDefs

Corresponds to: backend/supercollider/synthdefs/drums.scd (percussion section)

Acoustic/ethnic hand percussion instruments for Latin, Afrobeats, and World music.
"""

_DRUM_PARAMS = ["amp", "decay"]

SYNTHDEFS = [
    # Latin Percussion
    {"name": "congaHigh",   "display_name": "High Conga",   "category": "Percussion", "description": "High conga drum",   "parameters": _DRUM_PARAMS},
    {"name": "congaLow",    "display_name": "Low Conga",    "category": "Percussion", "description": "Low conga drum",    "parameters": _DRUM_PARAMS},
    {"name": "bongoHigh",   "display_name": "High Bongo",   "category": "Percussion", "description": "High bongo drum",   "parameters": _DRUM_PARAMS},
    {"name": "bongoLow",    "display_name": "Low Bongo",    "category": "Percussion", "description": "Low bongo drum",    "parameters": _DRUM_PARAMS},
    {"name": "timbaleHigh", "display_name": "High Timbale", "category": "Percussion", "description": "High timbale",      "parameters": _DRUM_PARAMS},
    {"name": "timbaleLow",  "display_name": "Low Timbale",  "category": "Percussion", "description": "Low timbale",       "parameters": _DRUM_PARAMS},

    # World Percussion
    {"name": "tambourine",  "display_name": "Tambourine",   "category": "Percussion", "description": "Tambourine",        "parameters": _DRUM_PARAMS},
    {"name": "shaker",      "display_name": "Shaker",       "category": "Percussion", "description": "Shaker",            "parameters": _DRUM_PARAMS},
    {"name": "claves",      "display_name": "Claves",       "category": "Percussion", "description": "Claves",            "parameters": _DRUM_PARAMS},
    {"name": "woodblock",   "display_name": "Woodblock",    "category": "Percussion", "description": "Woodblock",         "parameters": _DRUM_PARAMS},
    {"name": "agogoHigh",   "display_name": "High Agogo",   "category": "Percussion", "description": "High agogo bell",   "parameters": _DRUM_PARAMS},
    {"name": "agogoLow",    "display_name": "Low Agogo",    "category": "Percussion", "description": "Low agogo bell",    "parameters": _DRUM_PARAMS},
]
