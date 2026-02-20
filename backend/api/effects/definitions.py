"""
Effect Definitions Routes - Information about available effects
"""
import logging
from fastapi import APIRouter
from typing import List

from backend.models.effects import EffectListResponse
from backend.services.daw.effect_definitions import (
    get_all_effect_definitions,
    get_effects_by_category,
    get_effect_categories
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/definitions", response_model=EffectListResponse)
async def get_effect_definitions():
    """
    Get list of all available effect definitions

    Returns metadata for all effects including:
    - Effect name and display name
    - Category (Filter, EQ, Dynamics, etc.)
    - Parameters with ranges and defaults
    - Description
    """
    try:
        effects = get_all_effect_definitions()
        return EffectListResponse(effects=effects)
    except Exception as e:
        logger.error(f"❌ Failed to get effect definitions: {e}")
        raise


@router.get("/categories", response_model=List[str])
async def get_categories():
    """Get list of all effect categories"""
    try:
        return get_effect_categories()
    except Exception as e:
        logger.error(f"❌ Failed to get effect categories: {e}")
        raise


@router.get("/categories/{category}", response_model=EffectListResponse)
async def get_effects_in_category(category: str):
    """Get all effects in a specific category"""
    try:
        effects = get_effects_by_category(category)
        return EffectListResponse(effects=effects)
    except Exception as e:
        logger.error(f"❌ Failed to get effects in category {category}: {e}")
        raise

