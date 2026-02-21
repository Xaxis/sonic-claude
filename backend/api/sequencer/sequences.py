"""
Sequence Routes - INTERNAL operations for sequences within compositions

Sequences are INTERNAL to compositions. They are NOT exposed as a public API.

Use the Composition API instead:
- POST /api/compositions - Create new composition (creates sequence internally)
- GET /api/compositions - List all compositions
- GET /api/compositions/{id} - Load composition (loads sequence + all state)
- PUT /api/compositions/{id} - Update composition metadata
- DELETE /api/compositions/{id} - Delete composition

These endpoints are for INTERNAL operations only (updating sequence settings
within an existing composition, like loop points, zoom, grid, etc).
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import SequenceNotFoundError, ServiceError
from backend.services.daw.sequencer_service import SequencerService
from backend.models.sequence import Sequence

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# REMOVED: Public sequence creation/deletion
# ============================================================================
# Sequences are created/deleted ONLY through the Composition API.
# Use POST /api/compositions to create a new composition (which creates a sequence internally).
# Use DELETE /api/compositions/{id} to delete a composition (which deletes the sequence).


@router.get("/sequences/{sequence_id}", response_model=Sequence)
async def get_sequence(
    sequence_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """
    Get sequence by ID (INTERNAL USE)

    This is for internal use only. Frontend should use GET /api/compositions/{id}
    to load the complete composition (sequence + mixer + effects).
    """
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
    """
    Update sequence properties (INTERNAL USE)

    Updates loop settings and UI state within an existing composition.
    For updating composition metadata (name, tempo, time signature),
    use PUT /api/compositions/{id} instead.
    """
    sequence = sequencer_service.get_sequence(sequence_id)
    if not sequence:
        raise SequenceNotFoundError(sequence_id)

    # Loop settings (internal to sequence)
    if "loop_enabled" in request:
        sequence.loop_enabled = request["loop_enabled"]
    if "loop_start" in request:
        sequence.loop_start = request["loop_start"]
    if "loop_end" in request:
        sequence.loop_end = request["loop_end"]

    # UI settings (internal to sequence)
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

    logger.info(f"✅ Updated sequence {sequence_id} settings")

    return sequence
