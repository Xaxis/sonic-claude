"""
API route handlers
"""
from .ai import router as ai_router
from .osc import router as osc_router

__all__ = ["ai_router", "osc_router"]

