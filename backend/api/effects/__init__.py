"""
Effects API - Modular router combining all effects endpoints

This module organizes effects routes into logical groups:
- definitions: Available effect definitions
- track_effects: Per-track insert effect chains
"""
from fastapi import APIRouter

from . import definitions, track_effects

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(definitions.router, tags=["effects-definitions"])
router.include_router(track_effects.router, tags=["effects-track"])

