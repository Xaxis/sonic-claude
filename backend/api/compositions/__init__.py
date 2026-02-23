"""
Compositions API - Modular router combining all composition endpoints

This module organizes composition routes into logical groups:
- crud: Save, get, list, delete compositions and chat history
- history: Version history, restore version, recover from autosave
- tracks: Track management within compositions (nested resource)
- clips: Clip management within compositions (nested resource)
- startup: Load all compositions on app initialization
"""
from fastapi import APIRouter

from . import crud, history, tracks, clips, startup

# Create main router
router = APIRouter()

# Include all sub-routers (no prefix needed - they define their own paths)
router.include_router(crud.router, tags=["compositions"])
router.include_router(history.router, tags=["compositions"])
router.include_router(tracks.router, tags=["compositions-tracks"])
router.include_router(clips.router, tags=["compositions-clips"])
router.include_router(startup.router, tags=["compositions"])

