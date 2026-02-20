"""
Synthesis Routes - Control synth creation and parameters
"""
import logging
from typing import Optional, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.core.dependencies import get_synthesis_service
from backend.core.exceptions import SynthNotFoundError, ServiceError
from backend.services.daw.synthesis_service import SynthesisService

router = APIRouter()
logger = logging.getLogger(__name__)


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
async def create_synth(
    request: CreateSynthRequest,
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
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
        raise ServiceError(f"Failed to create synth: {str(e)}")


@router.get("/synthesis/synths")
async def get_active_synths(
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Get all active synths"""
    return synthesis_service.get_active_synths()


@router.get("/synthesis/synths/{synth_id}")
async def get_synth(
    synth_id: int,
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Get info for a specific synth"""
    synth_info = synthesis_service.get_synth_info(synth_id)
    if not synth_info:
        raise SynthNotFoundError(synth_id)
    return synth_info


@router.put("/synthesis/synths/{synth_id}")
async def set_synth_param(
    synth_id: int,
    request: SetParamRequest,
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Set a synth parameter"""
    try:
        await synthesis_service.set_synth_param(synth_id, request.param, request.value)
        return {"status": "ok"}
    except ValueError as e:
        # ValueError is raised when synth is not found
        raise SynthNotFoundError(synth_id)
    except Exception as e:
        logger.error(f"❌ Failed to set synth parameter: {e}")
        raise ServiceError(f"Failed to set synth parameter: {str(e)}")


@router.delete("/synthesis/synths/{synth_id}")
async def delete_synth(
    synth_id: int,
    release: bool = True,
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Delete a synth (release or free immediately)"""
    try:
        if release:
            await synthesis_service.release_synth(synth_id)
        else:
            await synthesis_service.free_synth(synth_id)
        return {"status": "ok"}
    except ValueError as e:
        # ValueError is raised when synth is not found
        raise SynthNotFoundError(synth_id)
    except Exception as e:
        logger.error(f"❌ Failed to delete synth: {e}")
        raise ServiceError(f"Failed to delete synth: {str(e)}")


@router.delete("/synthesis/synths")
async def delete_all_synths(
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Delete all active synths"""
    try:
        await synthesis_service.free_all_synths()
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"❌ Failed to delete all synths: {e}")
        raise ServiceError(f"Failed to delete all synths: {str(e)}")

