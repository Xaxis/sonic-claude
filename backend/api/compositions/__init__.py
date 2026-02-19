"""
Compositions API - Modular router combining all composition endpoints

This module organizes composition routes into logical groups:
- crud: Save, get, list, delete compositions and chat history
- history: Version history, restore version, recover from autosave
- startup: Load all compositions on app initialization
"""
from fastapi import APIRouter

from . import crud, history, startup

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(crud.router, tags=["compositions"])
router.include_router(history.router, tags=["compositions"])
router.include_router(startup.router, tags=["compositions"])

