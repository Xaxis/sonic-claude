
"""
SynthDef Discovery Routes - Get available synthesizer definitions

This module provides endpoints for discovering available SynthDefs
that can be used for tracks, clips, and previews.
"""
import logging
from fastapi import APIRouter

from backend.services.daw.registry import get_all_synthdefs, get_synthdefs_by_category, get_categories
from backend.core.exceptions import ServiceError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/synthdefs")
async def get_synthdefs():
    """
    Get list of available synth definitions
    
    Returns:
        List of SynthDef metadata with name, display_name, category, description
    """
    try:
        return get_all_synthdefs()
    except Exception as e:
        logger.error(f"❌ Failed to get synthdefs: {e}")
        raise ServiceError(f"Failed to get synthdefs: {str(e)}")


@router.get("/synthdefs/categories")
async def get_synthdef_categories():
    """
    Get list of SynthDef categories
    
    Returns:
        List of category names
    """
    try:
        return get_categories()
    except Exception as e:
        logger.error(f"❌ Failed to get synthdef categories: {e}")
        raise ServiceError(f"Failed to get synthdef categories: {str(e)}")


@router.get("/synthdefs/category/{category}")
async def get_synthdefs_by_category_route(category: str):
    """
    Get SynthDefs filtered by category
    
    Args:
        category: Category name (e.g., "Drums", "Synth", "Bass")
    
    Returns:
        List of SynthDef metadata for the specified category
    """
    try:
        return get_synthdefs_by_category(category)
    except Exception as e:
        logger.error(f"❌ Failed to get synthdefs for category {category}: {e}")
        raise ServiceError(f"Failed to get synthdefs for category: {str(e)}")

