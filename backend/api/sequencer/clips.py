"""
Clip Routes - Operations for managing clips within sequences
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import (
    SequenceNotFoundError,
    ClipNotFoundError,
)
from backend.services.daw.sequencer_service import SequencerService
from backend.models.sequence import Clip, AddClipRequest, UpdateClipRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/sequences/{sequence_id}/clips", response_model=Clip)
async def add_clip(
    sequence_id: str,
    request: AddClipRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Add a clip to a sequence"""
    clip = sequencer_service.add_clip(sequence_id, request)
    if not clip:
        raise SequenceNotFoundError(sequence_id)
    return clip


@router.get("/sequences/{sequence_id}/clips", response_model=list[Clip])
async def get_clips(
    sequence_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Get all clips in a sequence"""
    clips = sequencer_service.get_clips(sequence_id)
    if clips is None:
        raise SequenceNotFoundError(sequence_id)
    return clips


@router.put("/sequences/{sequence_id}/clips/{clip_id}", response_model=Clip)
async def update_clip(
    sequence_id: str,
    clip_id: str,
    request: UpdateClipRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Update a clip"""
    clip = sequencer_service.update_clip(sequence_id, clip_id, request)
    if not clip:
        raise ClipNotFoundError(clip_id, sequence_id)
    return clip


@router.delete("/sequences/{sequence_id}/clips/{clip_id}")
async def delete_clip(
    sequence_id: str,
    clip_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Delete a clip"""
    success = sequencer_service.delete_clip(sequence_id, clip_id)
    if not success:
        raise ClipNotFoundError(clip_id, sequence_id)
    return {"status": "ok", "message": f"Clip {clip_id} deleted"}


@router.post("/sequences/{sequence_id}/clips/{clip_id}/duplicate", response_model=Clip)
async def duplicate_clip(
    sequence_id: str,
    clip_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Duplicate a clip"""
    clip = sequencer_service.duplicate_clip(sequence_id, clip_id)
    if not clip:
        raise ClipNotFoundError(clip_id, sequence_id)
    return clip

