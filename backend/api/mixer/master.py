"""
Mixer Master API - Master channel controls
"""
from fastapi import APIRouter, Depends, HTTPException

from backend.models.mixer import MasterChannel, UpdateMasterRequest
from backend.services.mixer_service import MixerService
from backend.core.dependencies import get_mixer_service

router = APIRouter()


@router.get("/master", response_model=MasterChannel)
async def get_master(
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Get master channel"""
    return mixer_service.get_master()


@router.patch("/master", response_model=MasterChannel)
async def update_master(
    request: UpdateMasterRequest,
    mixer_service: MixerService = Depends(get_mixer_service)
):
    """Update master channel properties"""
    try:
        return await mixer_service.update_master(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

