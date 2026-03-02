"""
Drum Machine SynthDefs

Corresponds to: backend/supercollider/synthdefs/drums.scd (drum machine section)

TR-808/909 style electronic drum sounds. Each SynthDef is an atomic drum voice —
kits in registry/kits/ compose these into named drum machines with per-pad tuning.
"""

_DRUM_PARAMS = ["amp", "decay"]

SYNTHDEFS = [
    # Kicks
    {"name": "kick808",       "display_name": "808 Kick",          "category": "Drums", "description": "Classic 808 kick drum",    "parameters": ["amp", "decay", "freq", "pitch"]},
    {"name": "kick909",       "display_name": "909 Kick",          "category": "Drums", "description": "Classic 909 kick drum",    "parameters": ["amp", "decay", "freq", "punch"]},
    {"name": "kickAcoustic",  "display_name": "Acoustic Kick",     "category": "Drums", "description": "Acoustic kick drum",       "parameters": _DRUM_PARAMS},

    # Snares
    {"name": "snare808",      "display_name": "808 Snare",         "category": "Drums", "description": "Classic 808 snare",        "parameters": ["amp", "decay", "tone", "noise"]},
    {"name": "snare909",      "display_name": "909 Snare",         "category": "Drums", "description": "Classic 909 snare",        "parameters": ["amp", "decay", "tone", "noise"]},
    {"name": "snareAcoustic", "display_name": "Acoustic Snare",    "category": "Drums", "description": "Acoustic snare drum",      "parameters": _DRUM_PARAMS},

    # Hi-Hats
    {"name": "hihatClosed808","display_name": "808 Closed Hi-Hat", "category": "Drums", "description": "808 closed hi-hat",        "parameters": ["amp", "decay"]},
    {"name": "hihatOpen808",  "display_name": "808 Open Hi-Hat",   "category": "Drums", "description": "808 open hi-hat",          "parameters": ["amp", "decay"]},
    {"name": "hihatClosed909","display_name": "909 Closed Hi-Hat", "category": "Drums", "description": "909 closed hi-hat",        "parameters": ["amp", "decay"]},
    {"name": "hihatOpen909",  "display_name": "909 Open Hi-Hat",   "category": "Drums", "description": "909 open hi-hat",          "parameters": ["amp", "decay"]},

    # Toms
    {"name": "tomLow808",     "display_name": "808 Low Tom",       "category": "Drums", "description": "808 low tom",              "parameters": ["amp", "decay", "freq"]},
    {"name": "tomMid808",     "display_name": "808 Mid Tom",       "category": "Drums", "description": "808 mid tom",              "parameters": ["amp", "decay", "freq"]},
    {"name": "tomHigh808",    "display_name": "808 High Tom",      "category": "Drums", "description": "808 high tom",             "parameters": ["amp", "decay", "freq"]},

    # Cymbals
    {"name": "cymbalCrash",   "display_name": "Crash Cymbal",      "category": "Drums", "description": "Crash cymbal",             "parameters": ["amp", "decay"]},
    {"name": "cymbalRide",    "display_name": "Ride Cymbal",       "category": "Drums", "description": "Ride cymbal",              "parameters": ["amp", "decay"]},
    {"name": "cymbalSplash",  "display_name": "Splash Cymbal",     "category": "Drums", "description": "Splash cymbal",            "parameters": ["amp", "decay"]},

    # Other percussion
    {"name": "clap808",       "display_name": "808 Clap",          "category": "Drums", "description": "808 hand clap",            "parameters": ["amp", "decay", "spread"]},
    {"name": "cowbell808",    "display_name": "808 Cowbell",       "category": "Drums", "description": "808 cowbell",              "parameters": ["amp", "decay", "freq"]},
    {"name": "rimshot808",    "display_name": "808 Rimshot",       "category": "Drums", "description": "808 rimshot",              "parameters": _DRUM_PARAMS},
]
