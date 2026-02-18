"""
SynthDef Routes - Information about available synthesizer definitions
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class SynthDefInfo(BaseModel):
    """SynthDef information"""
    name: str
    display_name: str
    category: str
    description: str
    parameters: list[str]


@router.get("/synthdefs", response_model=list[SynthDefInfo])
async def get_synthdefs():
    """Get list of available SynthDefs for MIDI tracks"""
    # This is a static list based on what's loaded in load_synthdefs.scd
    # In a more advanced system, this could query SuperCollider dynamically
    synthdefs = [
        # Basic Synths
        SynthDefInfo(
            name="sine",
            display_name="Sine Wave",
            category="Basic",
            description="Simple sine wave oscillator",
            parameters=["attack", "release"]
        ),
        SynthDefInfo(
            name="saw",
            display_name="Saw Wave",
            category="Basic",
            description="Sawtooth wave with low-pass filter",
            parameters=["attack", "release", "cutoff"]
        ),
        SynthDefInfo(
            name="square",
            display_name="Square Wave",
            category="Basic",
            description="Square/pulse wave with variable width",
            parameters=["attack", "release", "width"]
        ),

        # Professional Instruments
        SynthDefInfo(
            name="fm",
            display_name="FM Synth",
            category="Synth",
            description="Frequency modulation synthesis",
            parameters=["attack", "decay", "sustain", "release", "modRatio", "modIndex"]
        ),
        SynthDefInfo(
            name="subtractive",
            display_name="Subtractive Synth",
            category="Synth",
            description="Analog-style subtractive synthesis",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "filterEnv"]
        ),
        SynthDefInfo(
            name="pad",
            display_name="Pad Synth",
            category="Synth",
            description="Lush, detuned pad sound",
            parameters=["attack", "decay", "sustain", "release", "detune", "cutoff"]
        ),
        SynthDefInfo(
            name="bass",
            display_name="Bass Synth",
            category="Bass",
            description="Deep, punchy bass sound",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "drive"]
        ),
        SynthDefInfo(
            name="lead",
            display_name="Lead Synth",
            category="Lead",
            description="Bright, cutting lead sound",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "detune"]
        ),
        SynthDefInfo(
            name="pluck",
            display_name="Plucked String",
            category="Acoustic",
            description="Karplus-Strong plucked string",
            parameters=["attack", "release", "coef"]
        ),
        SynthDefInfo(
            name="bell",
            display_name="Bell",
            category="Acoustic",
            description="Metallic bell/mallet sound",
            parameters=["attack", "release", "brightness"]
        ),
        SynthDefInfo(
            name="organ",
            display_name="Organ",
            category="Keys",
            description="Tonewheel organ sound",
            parameters=["attack", "release", "drawbar1", "drawbar2", "drawbar3"]
        ),
    ]

    return synthdefs

