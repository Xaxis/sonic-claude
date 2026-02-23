"""
DAW Services - Digital Audio Workstation state management

Services in this module manage DAW state and functionality:
- CompositionState (compositions, tracks, clips)
- PlaybackEngine (playback control, scheduling)
- Mixer (channels, routing, master)
- Effects (definitions, track effects)
- Synthesis (synth instances)
- Mixer channels (SC synth management)
- Track meters (per-track metering)
"""

from .composition_state_service import CompositionStateService
from .playback_engine_service import PlaybackEngineService
from .mixer_service import MixerService
from .mixer_channel_service import MixerChannelSynthManager
from .track_meter_service import TrackMeterHandler
from .effects_service import TrackEffectsService
from .effect_definitions import EFFECT_DEFINITIONS, get_effect_definition
from .synthesis_service import SynthesisService

__all__ = [
    "CompositionStateService",
    "PlaybackEngineService",
    "MixerService",
    "MixerChannelSynthManager",
    "TrackMeterHandler",
    "TrackEffectsService",
    "EFFECT_DEFINITIONS",
    "get_effect_definition",
    "SynthesisService",
]
