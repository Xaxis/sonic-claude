"""
Preview Routes - Preview MIDI notes for UI feedback
"""
import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import ServiceError
from backend.services.sequencer_service import SequencerService

router = APIRouter()
logger = logging.getLogger(__name__)


class PreviewNoteRequest(BaseModel):
    """Request model for previewing a MIDI note"""
    note: int = Field(..., ge=0, le=127, description="MIDI note number (0-127)")
    velocity: int = Field(default=100, ge=1, le=127, description="Note velocity (1-127)")
    duration: float = Field(default=0.5, gt=0, description="Note duration in seconds")
    instrument: str = Field(default="sine", description="Instrument/synthdef to use")


@router.post("/preview-note")
async def preview_note(
    request: PreviewNoteRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """
    Preview a MIDI note with specified instrument

    Triggers a one-shot note playback for UI feedback (piano keyboard clicks, note editing, etc.)
    """
    try:
        await sequencer_service.preview_note(
            note=request.note,
            velocity=request.velocity,
            duration=request.duration,
            instrument=request.instrument
        )
        return {
            "status": "ok",
            "note": request.note,
            "velocity": request.velocity,
            "duration": request.duration,
            "instrument": request.instrument
        }
    except Exception as e:
        logger.error(f"❌ Failed to preview note: {e}")
        raise ServiceError(f"Failed to preview note: {str(e)}")

