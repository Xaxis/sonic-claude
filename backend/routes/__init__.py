"""
API route handlers
"""
from .ai import router as ai_router
from .osc import router as osc_router
from .samples import router as samples_router

__all__ = ["ai_router", "osc_router", "samples_router"]

