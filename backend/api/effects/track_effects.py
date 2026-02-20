"""
Track Effects Routes - Per-track insert effect chains
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict

from backend.core.dependencies import get_track_effects_service
from backend.services.daw.effects_service import TrackEffectsService
from backend.models.effects import (
    EffectInstance,
    TrackEffectChainResponse,
    CreateEffectRequest,
    UpdateEffectRequest,
    MoveEffectRequest
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/track/{track_id}", response_model=TrackEffectChainResponse)
async def get_track_effect_chain(
    track_id: str,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """
    Get effect chain for a track

    Returns all effects on the track ordered by slot index
    """
    try:
        chain = effects_service.get_track_effect_chain(track_id)
        return TrackEffectChainResponse(
            track_id=chain.track_id,
            effects=chain.effects
        )
    except Exception as e:
        logger.error(f"❌ Failed to get track effect chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/{track_id}", response_model=EffectInstance)
async def create_effect(
    track_id: str,
    request: CreateEffectRequest,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """
    Create a new effect on a track

    Args:
        track_id: Track ID to add effect to
        request: Effect creation parameters

    Returns:
        Created effect instance
    """
    try:
        effect = await effects_service.create_effect(
            track_id=track_id,
            effect_name=request.effect_name,
            slot_index=request.slot_index,
            display_name=request.display_name
        )
        return effect
    except ValueError as e:
        logger.error(f"❌ Invalid effect creation request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to create effect: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{effect_id}", response_model=EffectInstance)
async def get_effect(
    effect_id: str,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Get effect instance by ID"""
    try:
        effect = effects_service.get_effect(effect_id)
        if effect is None:
            raise HTTPException(status_code=404, detail=f"Effect {effect_id} not found")
        return effect
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get effect: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{effect_id}", response_model=EffectInstance)
async def update_effect(
    effect_id: str,
    request: UpdateEffectRequest,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """
    Update effect parameters or state

    Can update:
    - Individual parameters (e.g., cutoff, resonance)
    - Bypass state
    - Display name
    """
    try:
        effect = effects_service.get_effect(effect_id)
        if effect is None:
            raise HTTPException(status_code=404, detail=f"Effect {effect_id} not found")

        # Update parameters
        if request.parameters:
            for param_name, param_value in request.parameters.items():
                await effects_service.update_effect_parameter(effect_id, param_name, param_value)

        # Update bypass state
        if request.is_bypassed is not None:
            await effects_service.update_effect_bypass(effect_id, request.is_bypassed)

        # Update display name
        if request.display_name is not None:
            effect.display_name = request.display_name

        return effect

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"❌ Invalid effect update request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to update effect: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{effect_id}")
async def delete_effect(
    effect_id: str,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Delete an effect instance"""
    try:
        await effects_service.delete_effect(effect_id)
        return {"status": "success", "message": f"Effect {effect_id} deleted"}
    except ValueError as e:
        logger.error(f"❌ Effect not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to delete effect: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{effect_id}/move", response_model=EffectInstance)
async def move_effect(
    effect_id: str,
    request: MoveEffectRequest,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """
    Move effect to a different slot

    Args:
        effect_id: Effect instance ID
        request: New slot index

    Returns:
        Updated effect instance
    """
    try:
        effect = await effects_service.move_effect(effect_id, request.new_slot_index)
        return effect
    except ValueError as e:
        logger.error(f"❌ Invalid move request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to move effect: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/track/{track_id}/clear")
async def clear_track_effects(
    track_id: str,
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Remove all effects from a track"""
    try:
        await effects_service.clear_track_effects(track_id)
        return {"status": "success", "message": f"Cleared all effects from track {track_id}"}
    except Exception as e:
        logger.error(f"❌ Failed to clear track effects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

