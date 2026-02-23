"""
Mixer Master API - Master channel controls

NOTE: Master channel is part of composition state.
All master mutations should auto-persist the composition.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from backend.models.mixer import MasterChannel, UpdateMasterRequest
from backend.services.daw.mixer_service import MixerService
from backend.services.persistence.composition_service import CompositionService
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.effects_service import TrackEffectsService
from backend.core.dependencies import (
    get_mixer_service,
    get_composition_service,
    get_composition_state_service,
    get_track_effects_service
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/master", response_model=MasterChannel)
async def get_master(
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Get master channel"""
    return mixer_service.get_master()


@router.patch("/master", response_model=MasterChannel)
async def update_master(
    request: UpdateMasterRequest,
    mixer_service: MixerService = Depends(get_mixer_service),
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update master channel properties"""
    try:
        result = await mixer_service.update_master(request)

        # AUTO-PERSIST: Master channel is part of composition
        if composition_state_service.current_composition_id:
            composition_service.auto_persist_composition(
                composition_id=composition_state_service.current_composition_id,
                composition_state_service=composition_state_service,
                mixer_service=mixer_service,
                effects_service=effects_service
            )

        return result
    except Exception as e:
        logger.error(f"❌ Failed to update master channel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

