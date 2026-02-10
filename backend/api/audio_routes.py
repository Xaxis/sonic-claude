"""
Audio Routes - REST API for audio engine control

Provides REST endpoints for synth creation, control, and audio input
"""
import logging
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

# Will be injected from main.py
synthesis_service = None
audio_analyzer = None


def set_services(synth_svc, analyzer_svc):
    """Set service instances"""
    global synthesis_service, audio_analyzer
    synthesis_service = synth_svc
    audio_analyzer = analyzer_svc


class CreateSynthRequest(BaseModel):
    """Request model for creating a synth"""
    synthdef: str
    params: Optional[Dict[str, float]] = None
    group: int = 1
    bus: Optional[int] = None


class SetParamRequest(BaseModel):
    """Request model for setting a synth parameter"""
    param: str
    value: float


@router.post("/synthesis/synths")
async def create_synth(request: CreateSynthRequest):
    """Create a new synth"""
    try:
        synth_info = await synthesis_service.create_synth(
            synthdef=request.synthdef,
            params=request.params,
            group=request.group,
            bus=request.bus
        )
        return synth_info
    except Exception as e:
        logger.error(f"❌ Failed to create synth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/synthesis/synths")
async def get_active_synths():
    """Get all active synths"""
    return synthesis_service.get_active_synths()


@router.get("/synthesis/synths/{synth_id}")
async def get_synth(synth_id: int):
    """Get info for a specific synth"""
    synth_info = synthesis_service.get_synth_info(synth_id)
    if not synth_info:
        raise HTTPException(status_code=404, detail=f"Synth {synth_id} not found")
    return synth_info


@router.put("/synthesis/synths/{synth_id}")
async def set_synth_param(synth_id: int, request: SetParamRequest):
    """Set a synth parameter"""
    try:
        await synthesis_service.set_synth_param(synth_id, request.param, request.value)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to set synth parameter: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/synthesis/synths/{synth_id}")
async def delete_synth(synth_id: int, release: bool = True):
    """Delete a synth (release or free immediately)"""
    try:
        if release:
            await synthesis_service.release_synth(synth_id)
        else:
            await synthesis_service.free_synth(synth_id)
        return {"status": "ok"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to delete synth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/synthesis/synths")
async def delete_all_synths():
    """Delete all active synths"""
    try:
        await synthesis_service.free_all_synths()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Failed to delete all synths: {e}")
        raise HTTPException(status_code=500, detail=str(e))

