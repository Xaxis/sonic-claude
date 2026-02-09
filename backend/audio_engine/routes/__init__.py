"""
Audio engine API routes
"""
from .engine import router as engine_router
from .synthesis import router as synthesis_router, set_synthesis_service
from .effects import router as effects_router, set_effects_service
from .mixer import router as mixer_router, set_mixer_service
from .sequencer import router as sequencer_router, set_sequencer_service

__all__ = [
    "engine_router",
    "synthesis_router",
    "effects_router",
    "mixer_router",
    "sequencer_router",
    "set_synthesis_service",
    "set_effects_service",
    "set_mixer_service",
    "set_sequencer_service",
]

