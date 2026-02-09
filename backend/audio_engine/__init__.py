"""
Sonic Claude Audio Engine
Professional audio synthesis and processing engine built on SuperCollider
"""
from .core.engine_manager import AudioEngineManager
from .services.synthesis_service import SynthesisService
from .services.mixer_service import MixerService

__all__ = [
    "AudioEngineManager",
    "SynthesisService",
    "MixerService",
]

