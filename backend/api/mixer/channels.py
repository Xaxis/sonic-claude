"""
Mixer Channels API - CRUD operations for mixer channels
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from backend.models.mixer import (
    MixerChannel,
    CreateChannelRequest,
    UpdateChannelRequest,
)
from backend.services.mixer_service import MixerService
from backend.core.dependencies import get_mixer_service

router = APIRouter()


@router.get("/channels", response_model=List[MixerChannel])
async def get_channels(
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Get all mixer channels"""
    return mixer_service.get_all_channels()


@router.post("/channels", response_model=MixerChannel)
async def create_channel(
    request: CreateChannelRequest,
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Create a new mixer channel"""
    try:
        return mixer_service.create_channel(request)
    except Exception as e:
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
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Update mixer channel properties"""
    try:
        return mixer_service.update_channel(channel_id, request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: str,
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Delete a mixer channel"""
    try:
        mixer_service.delete_channel(channel_id)
        return {"status": "success", "message": "Channel deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

