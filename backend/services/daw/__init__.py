"""
DAW Services - Digital Audio Workstation state management

Services in this module manage DAW state and functionality:
- CompositionState (compositions, tracks, clips)
- PlaybackEngine (playback control, scheduling, note preview)
- Mixer (channels, routing, master)
- Effects (definitions, track effects)
- Mixer channels (SC synth management)
- Track meters (per-track metering)
"""

from .composition_state_service import CompositionStateService
from .playback_engine_service import PlaybackEngineService
from .mixer_service import MixerService
from .mixer_track_channels_service import MixerTrackChannelsService
from .track_meters_service import TrackMetersService
from .track_effects_service import TrackEffectsService
from .effect_definitions import EFFECT_DEFINITIONS, get_effect_definition

__all__ = [
    "CompositionStateService",
    "PlaybackEngineService",
    "MixerService",
    "MixerTrackChannelsService",
    "TrackMetersService",
    "TrackEffectsService",
    "EFFECT_DEFINITIONS",
    "get_effect_definition",
]
