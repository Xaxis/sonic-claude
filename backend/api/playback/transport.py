"""
Transport Routes - Playback control for the current composition

All playback operations work on the currently active composition.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.core.dependencies import (
    get_composition_state_service,
    get_playback_engine_service,
    get_composition_service,
    get_mixer_service,
    get_track_effects_service
)
from backend.core.exceptions import ServiceError
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.playback_engine_service import PlaybackEngineService
from backend.services.daw.composition_service import CompositionService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService

router = APIRouter()
logger = logging.getLogger(__name__)


class PlayRequest(BaseModel):
    """Request to start playback"""
    position: Optional[float] = Field(default=0.0, description="Start position in beats")


class SeekRequest(BaseModel):
    """Request to seek to a position"""
    position: float = Field(description="Position in beats")


class SetTempoRequest(BaseModel):
    """Request to set tempo"""
    tempo: float = Field(gt=0, le=300, description="Tempo in BPM")


class SetLoopRequest(BaseModel):
    """Request to set loop points"""
    enabled: bool = Field(description="Whether looping is enabled")
    start: Optional[float] = Field(default=None, ge=0, description="Loop start in beats")
    end: Optional[float] = Field(default=None, gt=0, description="Loop end in beats")


# ============================================================================
# PLAYBACK CONTROL
# ============================================================================

@router.post("/play")
async def play(
    request: PlayRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Start playback of the current composition"""
    try:
        if not composition_state_service.current_composition_id:
            raise ServiceError("No composition loaded")

        await playback_engine_service.play_composition(
            composition_state_service.current_composition_id,
            request.position
        )

        return {
            "status": "playing",
            "composition_id": composition_state_service.current_composition_id,
            "position": request.position
        }

    except Exception as e:
        logger.error(f"❌ Failed to start playback: {e}")
        raise ServiceError(f"Failed to start playback: {str(e)}")


@router.post("/stop")
async def stop(
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Stop playback"""
    try:
        await playback_engine_service.stop_playback()
        return {"status": "stopped"}

    except Exception as e:
        logger.error(f"❌ Failed to stop playback: {e}")
        raise ServiceError(f"Failed to stop playback: {str(e)}")


@router.post("/pause")
async def pause(
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Pause playback (keeps position)"""
    try:
        await playback_engine_service.pause_playback()
        return {"status": "paused"}

    except Exception as e:
        logger.error(f"❌ Failed to pause playback: {e}")
        raise ServiceError(f"Failed to pause playback: {str(e)}")


@router.post("/resume")
async def resume(
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Resume playback from paused position"""
    try:
        if not composition_state_service.current_composition_id:
            raise ServiceError("No composition loaded")

        # Resume from current playhead position
        await playback_engine_service.play_composition(
            composition_state_service.current_composition_id,
            playback_engine_service.playhead_position
        )
        return {"status": "playing"}

    except Exception as e:
        logger.error(f"❌ Failed to resume playback: {e}")
        raise ServiceError(f"Failed to resume playback: {str(e)}")


@router.post("/seek")
async def seek(
    request: SeekRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service)
):
    """Seek to a position in the current composition"""
    try:
        if not composition_state_service.current_composition_id:
            raise ServiceError("No composition loaded")

        await playback_engine_service.seek(
            composition_state_service.current_composition_id,
            request.position
        )

        return {
            "status": "success",
            "position": request.position
        }

    except Exception as e:
        logger.error(f"❌ Failed to seek: {e}")
        raise ServiceError(f"Failed to seek: {str(e)}")


@router.put("/tempo")
async def set_tempo(
    request: SetTempoRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Set tempo for the current composition"""
    try:
        if not composition_state_service.current_composition_id:
            raise ServiceError("No composition loaded")

        composition_id = composition_state_service.current_composition_id

        await playback_engine_service.set_tempo(composition_id, request.tempo)

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        return {
            "status": "success",
            "tempo": request.tempo
        }

    except Exception as e:
        logger.error(f"❌ Failed to set tempo: {e}")
        raise ServiceError(f"Failed to set tempo: {str(e)}")


@router.put("/loop")
async def set_loop(
    request: SetLoopRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    playback_engine_service: PlaybackEngineService = Depends(get_playback_engine_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Set loop points for the current composition"""
    try:
        if not composition_state_service.current_composition_id:
            raise ServiceError("No composition loaded")

        composition_id = composition_state_service.current_composition_id

        await playback_engine_service.set_loop(
            composition_id=composition_id,
            enabled=request.enabled,
            start=request.start,
            end=request.end
        )

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        composition = composition_state_service.get_composition(composition_id)

        return {
            "status": "success",
            "loop_enabled": composition.loop_enabled,
            "loop_start": composition.loop_start,
            "loop_end": composition.loop_end
        }

    except Exception as e:
        logger.error(f"❌ Failed to set loop: {e}")
        raise ServiceError(f"Failed to set loop: {str(e)}")

