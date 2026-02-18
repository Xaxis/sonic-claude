"""
Effect Definitions Registry - Library of available effects

Provides metadata for all available effects including parameters,
ranges, defaults, and descriptions.
"""
from typing import Dict, List
from backend.models.effects import EffectDefinition, EffectParameter


# ============================================================================
# EFFECT DEFINITIONS
# ============================================================================

EFFECT_DEFINITIONS: Dict[str, EffectDefinition] = {
    # FILTERS
    "lpf": EffectDefinition(
        name="lpf",
        display_name="Low-Pass Filter",
        category="Filter",
        description="Removes high frequencies above the cutoff point",
        parameters=[
            EffectParameter(name="cutoff", display_name="Cutoff", type="float", default=2000, min=20, max=20000, unit="Hz"),
            EffectParameter(name="resonance", display_name="Resonance", type="float", default=0.5, min=0.1, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "hpf": EffectDefinition(
        name="hpf",
        display_name="High-Pass Filter",
        category="Filter",
        description="Removes low frequencies below the cutoff point",
        parameters=[
            EffectParameter(name="cutoff", display_name="Cutoff", type="float", default=100, min=20, max=20000, unit="Hz"),
            EffectParameter(name="resonance", display_name="Resonance", type="float", default=0.5, min=0.1, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "bpf": EffectDefinition(
        name="bpf",
        display_name="Band-Pass Filter",
        category="Filter",
        description="Isolates a specific frequency range",
        parameters=[
            EffectParameter(name="freq", display_name="Frequency", type="float", default=1000, min=20, max=20000, unit="Hz"),
            EffectParameter(name="bandwidth", display_name="Bandwidth", type="float", default=0.5, min=0.1, max=2.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    
    # EQ
    "eq3": EffectDefinition(
        name="eq3",
        display_name="3-Band EQ",
        category="EQ",
        description="Three-band parametric equalizer with low/mid/high controls",
        parameters=[
            EffectParameter(name="lowGain", display_name="Low Gain", type="float", default=0, min=-24, max=24, unit="dB"),
            EffectParameter(name="lowFreq", display_name="Low Freq", type="float", default=100, min=20, max=500, unit="Hz"),
            EffectParameter(name="midGain", display_name="Mid Gain", type="float", default=0, min=-24, max=24, unit="dB"),
            EffectParameter(name="midFreq", display_name="Mid Freq", type="float", default=1000, min=200, max=8000, unit="Hz"),
            EffectParameter(name="midQ", display_name="Mid Q", type="float", default=1.0, min=0.5, max=4.0),
            EffectParameter(name="highGain", display_name="High Gain", type="float", default=0, min=-24, max=24, unit="dB"),
            EffectParameter(name="highFreq", display_name="High Freq", type="float", default=8000, min=2000, max=20000, unit="Hz"),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    
    # DYNAMICS
    "compressor": EffectDefinition(
        name="compressor",
        display_name="Compressor",
        category="Dynamics",
        description="Reduces dynamic range by attenuating signals above threshold",
        parameters=[
            EffectParameter(name="threshold", display_name="Threshold", type="float", default=-12, min=-60, max=0, unit="dB"),
            EffectParameter(name="ratio", display_name="Ratio", type="float", default=4, min=1, max=20),
            EffectParameter(name="attack", display_name="Attack", type="float", default=0.01, min=0.001, max=0.1, unit="s"),
            EffectParameter(name="release", display_name="Release", type="float", default=0.1, min=0.01, max=1.0, unit="s"),
            EffectParameter(name="makeupGain", display_name="Makeup Gain", type="float", default=0, min=0, max=24, unit="dB"),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "limiter": EffectDefinition(
        name="limiter",
        display_name="Limiter",
        category="Dynamics",
        description="Prevents signal from exceeding threshold (brick-wall limiting)",
        parameters=[
            EffectParameter(name="threshold", display_name="Threshold", type="float", default=-1, min=-24, max=0, unit="dB"),
            EffectParameter(name="release", display_name="Release", type="float", default=0.01, min=0.001, max=0.1, unit="s"),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "gate": EffectDefinition(
        name="gate",
        display_name="Gate",
        category="Dynamics",
        description="Silences signal below threshold (noise gate)",
        parameters=[
            EffectParameter(name="threshold", display_name="Threshold", type="float", default=-40, min=-80, max=0, unit="dB"),
            EffectParameter(name="attack", display_name="Attack", type="float", default=0.01, min=0.001, max=0.1, unit="s"),
            EffectParameter(name="release", display_name="Release", type="float", default=0.1, min=0.01, max=1.0, unit="s"),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    
    # DISTORTION
    "distortion": EffectDefinition(
        name="distortion",
        display_name="Distortion",
        category="Distortion",
        description="Adds harmonic saturation and overdrive",
        parameters=[
            EffectParameter(name="drive", display_name="Drive", type="float", default=1.0, min=1.0, max=20.0),
            EffectParameter(name="tone", display_name="Tone", type="float", default=0.5, min=0.0, max=1.0),
            EffectParameter(name="mix", display_name="Mix", type="float", default=1.0, min=0.0, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),

    # TIME-BASED
    "reverb": EffectDefinition(
        name="reverb",
        display_name="Reverb",
        category="Time-Based",
        description="Algorithmic reverb for adding space and ambience",
        parameters=[
            EffectParameter(name="roomSize", display_name="Room Size", type="float", default=0.5, min=0.0, max=1.0),
            EffectParameter(name="damping", display_name="Damping", type="float", default=0.5, min=0.0, max=1.0),
            EffectParameter(name="mix", display_name="Mix", type="float", default=0.3, min=0.0, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "delay": EffectDefinition(
        name="delay",
        display_name="Delay",
        category="Time-Based",
        description="Stereo delay with feedback",
        parameters=[
            EffectParameter(name="delayTime", display_name="Delay Time", type="float", default=0.25, min=0.001, max=2.0, unit="s"),
            EffectParameter(name="feedback", display_name="Feedback", type="float", default=0.5, min=0.0, max=0.95),
            EffectParameter(name="mix", display_name="Mix", type="float", default=0.3, min=0.0, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "chorus": EffectDefinition(
        name="chorus",
        display_name="Chorus",
        category="Time-Based",
        description="Modulated delay for thickening and widening",
        parameters=[
            EffectParameter(name="rate", display_name="Rate", type="float", default=0.5, min=0.1, max=10.0, unit="Hz"),
            EffectParameter(name="depth", display_name="Depth", type="float", default=0.02, min=0.005, max=0.05, unit="s"),
            EffectParameter(name="mix", display_name="Mix", type="float", default=0.5, min=0.0, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "flanger": EffectDefinition(
        name="flanger",
        display_name="Flanger",
        category="Time-Based",
        description="Short modulated delay for sweeping jet-like effect",
        parameters=[
            EffectParameter(name="rate", display_name="Rate", type="float", default=0.2, min=0.05, max=5.0, unit="Hz"),
            EffectParameter(name="depth", display_name="Depth", type="float", default=0.005, min=0.001, max=0.01, unit="s"),
            EffectParameter(name="feedback", display_name="Feedback", type="float", default=0.5, min=0.0, max=0.9),
            EffectParameter(name="mix", display_name="Mix", type="float", default=0.5, min=0.0, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "phaser": EffectDefinition(
        name="phaser",
        display_name="Phaser",
        category="Time-Based",
        description="All-pass filter modulation for sweeping phase effect",
        parameters=[
            EffectParameter(name="rate", display_name="Rate", type="float", default=0.3, min=0.05, max=5.0, unit="Hz"),
            EffectParameter(name="depth", display_name="Depth", type="float", default=0.5, min=0.1, max=1.0),
            EffectParameter(name="stages", display_name="Stages", type="float", default=4, min=1, max=8),
            EffectParameter(name="mix", display_name="Mix", type="float", default=0.5, min=0.0, max=1.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),

    # UTILITY
    "gain": EffectDefinition(
        name="gain",
        display_name="Gain",
        category="Utility",
        description="Simple volume adjustment",
        parameters=[
            EffectParameter(name="gain", display_name="Gain", type="float", default=0, min=-48, max=24, unit="dB"),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
    "stereoWidth": EffectDefinition(
        name="stereoWidth",
        display_name="Stereo Width",
        category="Utility",
        description="Adjust stereo image width using mid-side processing",
        parameters=[
            EffectParameter(name="width", display_name="Width", type="float", default=1.0, min=0.0, max=2.0),
            EffectParameter(name="bypass", display_name="Bypass", type="float", default=0, min=0, max=1),
        ]
    ),
}


def get_effect_definition(effect_name: str) -> EffectDefinition:
    """Get effect definition by name"""
    if effect_name not in EFFECT_DEFINITIONS:
        raise ValueError(f"Unknown effect: {effect_name}")
    return EFFECT_DEFINITIONS[effect_name]


def get_all_effect_definitions() -> List[EffectDefinition]:
    """Get all available effect definitions"""
    return list(EFFECT_DEFINITIONS.values())


def get_effects_by_category(category: str) -> List[EffectDefinition]:
    """Get all effects in a category"""
    return [effect for effect in EFFECT_DEFINITIONS.values() if effect.category == category]


def get_effect_categories() -> List[str]:
    """Get list of all effect categories"""
    categories = set(effect.category for effect in EFFECT_DEFINITIONS.values())
    return sorted(list(categories))

