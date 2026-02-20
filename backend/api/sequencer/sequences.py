"""
Sequence Routes - CRUD operations and version management for sequences
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import (
    SequenceNotFoundError,
    VersionNotFoundError,
    ServiceError,
)
from backend.services.daw.sequencer_service import SequencerService
from backend.models.sequence import Sequence, CreateSequenceRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/sequences", response_model=Sequence)
async def create_sequence(
    request: CreateSequenceRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Create a new sequence"""
    try:
        sequence = sequencer_service.create_sequence(request)
        return sequence
    except Exception as e:
        logger.error(f"❌ Failed to create sequence: {e}")
        raise ServiceError(f"Failed to create sequence: {str(e)}")


@router.get("/sequences", response_model=list[Sequence])
async def get_sequences(
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Get all sequences"""
    return sequencer_service.get_sequences()


@router.get("/sequences/{sequence_id}", response_model=Sequence)
async def get_sequence(
    sequence_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Get sequence by ID"""
    sequence = sequencer_service.get_sequence(sequence_id)
    if not sequence:
        raise SequenceNotFoundError(sequence_id)
    return sequence


@router.put("/sequences/{sequence_id}")
async def update_sequence(
    sequence_id: str,
    request: dict,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Update sequence properties (name, tempo, time_signature, loop settings)"""
    sequence = sequencer_service.get_sequence(sequence_id)
    if not sequence:
        raise SequenceNotFoundError(sequence_id)

    # Update fields
    if "name" in request:
        sequence.name = request["name"]
    if "tempo" in request:
        sequence.tempo = request["tempo"]
    if "time_signature" in request:
        sequence.time_signature = request["time_signature"]
    if "loop_enabled" in request:
        sequence.loop_enabled = request["loop_enabled"]
    if "loop_start" in request:
        sequence.loop_start = request["loop_start"]
    if "loop_end" in request:
        sequence.loop_end = request["loop_end"]

    # UI settings
    if "zoom" in request:
        sequence.zoom = request["zoom"]
    if "snap_enabled" in request:
        sequence.snap_enabled = request["snap_enabled"]
    if "grid_size" in request:
        sequence.grid_size = request["grid_size"]
    if "selected_clip_id" in request:
        sequence.selected_clip_id = request["selected_clip_id"]
    if "piano_roll_clip_id" in request:
        sequence.piano_roll_clip_id = request["piano_roll_clip_id"]
    if "sample_editor_clip_id" in request:
        sequence.sample_editor_clip_id = request["sample_editor_clip_id"]

    # NOTE: Composition auto-save handled by CompositionService
    # No need to manually save sequences anymore

    return sequence


@router.delete("/sequences/{sequence_id}")
async def delete_sequence(
    sequence_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Delete a sequence"""
    success = sequencer_service.delete_sequence(sequence_id)
    if not success:
        raise SequenceNotFoundError(sequence_id)
    return {"status": "ok", "message": f"Sequence {sequence_id} deleted"}


@router.post("/sequences/{sequence_id}/save")
async def save_sequence(
    sequence_id: str,
    create_version: bool = False,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Save composition - moved to composition API"""
    raise ServiceError("Sequence save moved to composition API - use /api/compositions/{id}/save")


@router.get("/sequences/{sequence_id}/versions")
async def list_versions(
    sequence_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """List composition versions - moved to composition API"""
    raise ServiceError("Version listing moved to composition API - use /api/compositions/{id}/history")


@router.post("/sequences/{sequence_id}/versions/{version_num}/restore")
async def restore_version(
    sequence_id: str,
    version_num: int,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Restore composition version - moved to composition API"""
    raise ServiceError("Version restore moved to composition API - use /api/compositions/{id}/history/{version}/restore")


@router.post("/sequences/{sequence_id}/recover")
async def recover_from_autosave(
    sequence_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Recover composition from autosave - moved to composition API"""
    raise ServiceError("Autosave recovery moved to composition API - use /api/compositions/{id}/recover")
