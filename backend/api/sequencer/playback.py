"""
Playback Routes - Control playback state and transport
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import (
    SequenceNotFoundError,
    ServiceError,
)
from backend.services.sequencer_service import SequencerService
from backend.models.sequence import SetTempoRequest, SeekRequest

router = APIRouter()
logger = logging.getLogger(__name__)


class PlaySequenceRequest(BaseModel):
    """Request to play a sequence"""
    position: Optional[float] = 0.0


@router.post("/sequences/{sequence_id}/play")
async def play_sequence(
    sequence_id: str,
    request: PlaySequenceRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Start playing a sequence"""
    try:
        await sequencer_service.play_sequence(sequence_id, request.position)
        return {
            "status": "playing",
            "sequence_id": sequence_id,
            "position": request.position,
        }
    except ValueError as e:
        # ValueError is raised when sequence is not found
        raise SequenceNotFoundError(sequence_id)
    except Exception as e:
        logger.error(f"❌ Failed to play sequence: {e}")
        raise ServiceError(f"Failed to play sequence: {str(e)}")


@router.post("/stop")
async def stop_playback(
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Stop playback"""
    await sequencer_service.stop_playback()
    return {"status": "stopped"}


@router.post("/pause")
async def pause_playback(
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Pause playback"""
    await sequencer_service.pause_playback()
    return {"status": "paused"}


@router.post("/resume")
async def resume_playback(
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Resume playback"""
    await sequencer_service.resume_playback()
    return {"status": "playing"}


@router.put("/tempo")
async def set_tempo(
    request: SetTempoRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Set global tempo"""
    await sequencer_service.set_tempo(request.tempo)
    return {"status": "ok", "tempo": request.tempo}


@router.put("/seek")
async def seek(
    request: SeekRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Seek to position with optional audio scrubbing"""
    await sequencer_service.seek(request.position, request.trigger_audio)
    return {"status": "ok", "position": request.position, "trigger_audio": request.trigger_audio}


@router.get("/state")
async def get_playback_state(
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Get current playback state"""
    return sequencer_service.get_playback_state()

