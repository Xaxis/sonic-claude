"""
Mixer Channels API - CRUD operations for mixer channels

NOTE: Mixer state is part of composition state.
All mixer mutations should auto-persist the composition.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
import logging

from backend.models.mixer import (
    MixerChannel,
    CreateChannelRequest,
    UpdateChannelRequest,
)
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


@router.get("/channels", response_model=List[MixerChannel])
async def get_channels(
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Get all mixer channels"""
    return mixer_service.get_all_channels()


@router.post("/channels", response_model=MixerChannel)
async def create_channel(
    request: CreateChannelRequest,
    mixer_service: MixerService = Depends(get_mixer_service),
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Create a new mixer channel"""
    try:
        channel = mixer_service.create_channel(request)

        # AUTO-PERSIST: Mixer state is part of composition
        if composition_state_service.current_composition_id:
            composition_service.auto_persist_composition(
                composition_id=composition_state_service.current_composition_id,
                composition_state_service=composition_state_service,
                mixer_service=mixer_service,
                effects_service=effects_service
            )

        return channel
    except Exception as e:
        logger.error(f"❌ Failed to create mixer channel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels/{channel_id}", response_model=MixerChannel)
async def get_channel(
    channel_id: str,
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Get a specific mixer channel"""
    channel = mixer_service.get_channel(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@router.patch("/channels/{channel_id}", response_model=MixerChannel)
async def update_channel(
    channel_id: str,
    request: UpdateChannelRequest,
    mixer_service: MixerService = Depends(get_mixer_service),
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update mixer channel properties"""
    try:
        channel = mixer_service.update_channel(channel_id, request)

        # AUTO-PERSIST: Mixer state is part of composition
        if composition_state_service.current_composition_id:
            composition_service.auto_persist_composition(
                composition_id=composition_state_service.current_composition_id,
                composition_state_service=composition_state_service,
                mixer_service=mixer_service,
                effects_service=effects_service
            )

        return channel
    except ValueError as e:
        logger.error(f"❌ Mixer channel not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to update mixer channel: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: str,
    mixer_service: MixerService = Depends(get_mixer_service),
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Delete a mixer channel"""
    try:
        mixer_service.delete_channel(channel_id)

        # AUTO-PERSIST: Mixer state is part of composition
        if composition_state_service.current_composition_id:
            composition_service.auto_persist_composition(
                composition_id=composition_state_service.current_composition_id,
                composition_state_service=composition_state_service,
                mixer_service=mixer_service,
                effects_service=effects_service
            )

        return {"status": "success", "message": "Channel deleted"}
    except ValueError as e:
        logger.error(f"❌ Mixer channel not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to delete mixer channel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

