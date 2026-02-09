"""
API route handlers
"""
# Audio Engine Routes
from .engine import router as engine_router
from .synthesis import router as synthesis_router
from .effects import router as effects_router
from .mixer import router as mixer_router
from .sequencer import router as sequencer_router
from .websocket import router as websocket_router

__all__ = [
    # Audio Engine
    "engine_router",
    "synthesis_router",
    "effects_router",
    "mixer_router",
    "sequencer_router",
    # WebSocket
    "websocket_router",
]

