"""
Playback API - Transport and playback control

This module handles playback operations for the current active composition.
Playback is a SERVICE operation, not an entity resource.
"""
from fastapi import APIRouter
from . import transport

router = APIRouter()
router.include_router(transport.router, tags=["playback"])

