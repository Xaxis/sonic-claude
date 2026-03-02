"""
Basic Waveform SynthDefs

Corresponds to: backend/supercollider/synthdefs/instruments.scd (basic waveforms)

These are the foundational oscillator shapes — no synthesis complexity,
just pure waveforms useful for learning, testing, and simple tones.
"""

_MELODIC_PARAMS = ["freq", "amp", "gate", "attack", "release"]

SYNTHDEFS = [
    {"name": "sine",     "display_name": "Sine Wave",     "category": "Basic", "description": "Pure sine wave oscillator",     "parameters": _MELODIC_PARAMS},
    {"name": "saw",      "display_name": "Sawtooth",      "category": "Basic", "description": "Sawtooth wave oscillator",      "parameters": _MELODIC_PARAMS},
    {"name": "square",   "display_name": "Square Wave",   "category": "Basic", "description": "Square wave oscillator",        "parameters": _MELODIC_PARAMS},
    {"name": "triangle", "display_name": "Triangle Wave", "category": "Basic", "description": "Triangle wave oscillator",      "parameters": _MELODIC_PARAMS},
]
