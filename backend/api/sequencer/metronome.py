"""
Metronome Routes - Control metronome settings
"""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import ServiceError
from backend.services.daw.sequencer_service import SequencerService

router = APIRouter()
logger = logging.getLogger(__name__)


class SetMetronomeVolumeRequest(BaseModel):
    volume: float


@router.put("/metronome/toggle")
async def toggle_metronome(
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Toggle metronome on/off"""
    try:
        enabled = sequencer_service.toggle_metronome()
        return {"enabled": enabled}
    except Exception as e:
        logger.error(f"❌ Failed to toggle metronome: {e}")
        raise ServiceError(f"Failed to toggle metronome: {str(e)}")


@router.put("/metronome/volume")
async def set_metronome_volume(
    request: SetMetronomeVolumeRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Set metronome volume (0.0 to 1.0)"""
    try:
        sequencer_service.set_metronome_volume(request.volume)
        return {"volume": request.volume}
    except Exception as e:
        logger.error(f"❌ Failed to set metronome volume: {e}")
        raise ServiceError(f"Failed to set metronome volume: {str(e)}")

