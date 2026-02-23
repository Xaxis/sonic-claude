"""
Synthesis Routes - Control synth creation and parameters
"""
import logging
from typing import Optional, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

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


class PreviewNoteRequest(BaseModel):
    """Request model for previewing a note"""
    note: int = Field(ge=0, le=127, description="MIDI note number")
    velocity: Optional[int] = Field(default=100, ge=1, le=127, description="Note velocity")
    duration: Optional[float] = Field(default=1.0, gt=0, description="Note duration in seconds")
    synthdef: Optional[str] = Field(default="default", description="Synth definition to use")


class UpdateMetronomeRequest(BaseModel):
    """Request model for updating metronome"""
    enabled: Optional[bool] = Field(default=None, description="Enable/disable metronome")
    volume: Optional[float] = Field(default=None, ge=0, le=1, description="Metronome volume")


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



# ============================================================================
# PREVIEW AND METRONOME
# ============================================================================

@router.post("/preview")
async def preview_note(
    request: PreviewNoteRequest,
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Preview a note by playing it briefly"""
    import asyncio

    try:
        # Create a temporary synth to preview the note
        synth_info = await synthesis_service.create_synth(
            synthdef=request.synthdef or "default",
            params={
                "freq": 440 * (2 ** ((request.note - 69) / 12)),  # Convert MIDI note to frequency
                "amp": request.velocity / 127.0 if request.velocity else 0.8,
                "gate": 1
            },
            group=1,
            bus=None
        )

        synth_id = synth_info.get("id")
        duration = request.duration or 1.0

        # Schedule the synth to be released after the duration
        async def release_after_duration():
            await asyncio.sleep(duration)
            try:
                await synthesis_service.release_synth(synth_id)
                logger.debug(f"🔇 Auto-released preview synth {synth_id} after {duration}s")
            except Exception as e:
                logger.warning(f"Failed to auto-release preview synth {synth_id}: {e}")

        # Fire and forget - don't wait for the release
        asyncio.create_task(release_after_duration())

        return {
            "status": "ok",
            "synth_id": synth_id,
            "note": request.note,
            "duration": duration
        }
    except Exception as e:
        logger.error(f"❌ Failed to preview note: {e}")
        raise ServiceError(f"Failed to preview note: {str(e)}")


@router.put("/metronome")
async def update_metronome(
    request: UpdateMetronomeRequest,
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Update metronome settings"""
    try:
        # TODO: Implement metronome service
        # For now, just return success
        return {
            "status": "ok",
            "enabled": request.enabled,
            "volume": request.volume
        }
    except Exception as e:
        logger.error(f"❌ Failed to update metronome: {e}")
        raise ServiceError(f"Failed to update metronome: {str(e)}")


@router.get("/synthdefs")
async def get_synthdefs(
    synthesis_service: SynthesisService = Depends(get_synthesis_service)
):
    """Get list of available synth definitions"""
    try:
        from backend.services.daw.synthdef_registry import get_all_synthdefs
        return get_all_synthdefs()
    except Exception as e:
        logger.error(f"❌ Failed to get synthdefs: {e}")
        raise ServiceError(f"Failed to get synthdefs: {str(e)}")
