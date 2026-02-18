"""
Audio API - Modular router combining all audio endpoints

This module organizes audio routes into logical groups:
- synthesis: Synth creation and control
- input: Audio input device and monitoring
"""
from fastapi import APIRouter

from . import synthesis, input

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(synthesis.router, tags=["synthesis"])
router.include_router(input.router, tags=["input"])

