"""
Audio API - Audio input device and monitoring

This module handles audio input routes:
- input: Audio input device and monitoring
"""
from fastapi import APIRouter

from . import input

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(input.router, tags=["input"])

