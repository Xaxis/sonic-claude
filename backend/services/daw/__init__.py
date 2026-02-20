"""
DAW Services - Digital Audio Workstation state management

Services in this module manage DAW state and functionality:
- Sequencer (sequences, clips, playback)
- Mixer (channels, routing, master)
- Effects (definitions, track effects)
- Synthesis (synth instances)
- Mixer channels (SC synth management)
- Track meters (per-track metering)
"""

from .sequencer_service import SequencerService
from .mixer_service import MixerService
from .mixer_channel_service import MixerChannelSynthManager
from .track_meter_service import TrackMeterHandler
from .effects_service import TrackEffectsService
from .effect_definitions import EFFECT_DEFINITIONS, get_effect_definition
from .synthesis_service import SynthesisService

__all__ = [
    "SequencerService",
    "MixerService",
    "MixerChannelSynthManager",
    "TrackMeterHandler",
    "TrackEffectsService",
    "EFFECT_DEFINITIONS",
    "get_effect_definition",
    "SynthesisService",
]
