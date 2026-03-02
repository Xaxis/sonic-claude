"""
Drum Kits API — returns the kit library for the browser
"""
from fastapi import APIRouter
from backend.services.daw.registry import get_all_kits

router = APIRouter()


@router.get("/drumkits")
async def get_drum_kits():
    """Return all available drum kit definitions."""
    return get_all_kits()
