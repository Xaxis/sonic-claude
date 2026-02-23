"""
Composition CRUD Operations - PRIMARY API for managing compositions (projects)

A Composition is a PROJECT (like .als in Ableton, .logicx in Logic Pro).
This is the MAIN API that users interact with.

Key Operations:
- POST /compositions - Create new composition (creates sequence internally)
- GET /compositions - List all compositions
- GET /compositions/{id} - Load composition (loads sequence + all state)
- PUT /compositions/{id} - Update composition metadata (name, tempo, time signature)
- POST /compositions/{id}/save - Save composition to disk
- DELETE /compositions/{id} - Delete composition
"""
import logging
import uuid
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_composition_service,
    get_sequencer_service,
    get_mixer_service,
    get_track_effects_service,
    get_ai_agent_service,
)
from backend.services.persistence.composition_service import CompositionService
from backend.services.daw.sequencer_service import SequencerService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService
from backend.services.ai.agent_service import AIAgentService
from backend.core.exceptions import ServiceError, ResourceNotFoundError
from backend.models.composition import (
    CreateCompositionRequest,
    UpdateCompositionRequest,
    SaveCompositionRequest,
    CompositionListResponse,
    CompositionCreatedResponse,
    CompositionSavedResponse,
    CompositionDeletedResponse,
)
from backend.models.sequence import Sequence, CreateSequenceRequest

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("/", response_model=CompositionCreatedResponse)
async def create_composition(
    request: CreateCompositionRequest,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Create a new composition (project)

    This is the PRIMARY way to create a new project. It:
    1. Creates a new sequence internally (with unique ID)
    2. Initializes mixer state
    3. Saves initial composition snapshot to disk
    4. Returns composition ID

    The composition ID = sequence ID (1:1 relationship).
    """
    try:
        # Generate unique composition ID
        composition_id = str(uuid.uuid4())

        # Create sequence internally (this is an implementation detail)
        sequence_request = CreateSequenceRequest(
            name=request.name,
            tempo=request.tempo or 120.0,
            time_signature=request.time_signature or "4/4"
        )
        temp_sequence = sequencer_service.create_sequence(sequence_request)

        # Override sequence ID with composition ID (they're the same)
        # Pydantic models are immutable, so we need to create a new object with model_copy()
        old_sequence_id = temp_sequence.id
        sequence = temp_sequence.model_copy(update={"id": composition_id})

        # Remove old sequence from dict and add with new ID
        if old_sequence_id in sequencer_service.sequences:
            del sequencer_service.sequences[old_sequence_id]
        sequencer_service.sequences[composition_id] = sequence

        # Mixer is already initialized in MixerService.__init__
        # No need to call initialize_mixer() - it doesn't exist

        # Build initial snapshot
        snapshot = composition_service.build_snapshot_from_services(
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            sequence_id=composition_id,
            name=request.name,
            metadata={"source": "create_composition", "initial": True}
        )

        if not snapshot:
            raise ServiceError(f"Failed to build initial snapshot for composition {composition_id}")

        # Save initial composition to disk
        composition_service.save_composition(
            composition_id=composition_id,
            snapshot=snapshot,
            create_history=True,  # Create initial history entry
            is_autosave=False
        )

        logger.info(f"✅ Created composition: {request.name} (ID: {composition_id})")

        return CompositionCreatedResponse(
            composition_id=composition_id,
            name=request.name,
            message=f"Composition '{request.name}' created successfully"
        )

    except Exception as e:
        logger.error(f"❌ Failed to create composition: {e}")
        raise ServiceError(f"Failed to create composition: {str(e)}")


@router.post("/{composition_id}/save", response_model=CompositionSavedResponse)
async def save_composition(
    composition_id: str,
    request: SaveCompositionRequest,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Save composition to disk

    This creates a complete snapshot of the current state and saves it.
    Optionally creates a history entry for versioning.
    """
    try:
        # Get sequence (composition contains ONE sequence)
        sequence = sequencer_service.get_sequence(composition_id)
        if not sequence:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Build complete snapshot
        snapshot = composition_service.build_snapshot_from_services(
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            sequence_id=composition_id,
            name=sequence.name,
            metadata=request.metadata or {"source": "manual_save" if not request.is_autosave else "autosave"}
        )

        if not snapshot:
            raise ServiceError(f"Failed to build snapshot for composition {composition_id}")

        # Save composition
        composition_service.save_composition(
            composition_id=composition_id,
            snapshot=snapshot,
            create_history=request.create_history,
            is_autosave=request.is_autosave
        )

        logger.info(f"💾 Saved composition {composition_id} (history={request.create_history}, autosave={request.is_autosave})")

        return CompositionSavedResponse(
            composition_id=composition_id,
            history_created=request.create_history,
            message=f"Composition saved successfully"
        )

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to save composition: {e}")
        raise ServiceError(f"Failed to save composition: {str(e)}")


@router.get("/", response_model=CompositionListResponse)
async def list_compositions(
    composition_service: CompositionService = Depends(get_composition_service)
):
    """
    List all compositions

    Returns lightweight metadata for all compositions (for browsing/selection).
    """
    try:
        compositions = composition_service.list_compositions()
        return CompositionListResponse(
            compositions=compositions,
            total=len(compositions)
        )
    except Exception as e:
        logger.error(f"❌ Failed to list compositions: {e}")
        raise ServiceError(f"Failed to list compositions: {str(e)}")


@router.get("/{composition_id}")
async def get_composition(
    composition_id: str,
    use_autosave: bool = False,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Load composition by ID

    This:
    1. Loads the composition snapshot from disk
    2. Restores it to all backend services (sequencer, mixer, effects)
    3. Sets it as the current active composition
    4. Returns the complete snapshot to the frontend

    This is what you call to "open" a composition.
    """
    try:
        snapshot = composition_service.load_composition(composition_id, use_autosave=use_autosave)
        if not snapshot:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Restore the composition to backend services
        success = composition_service.restore_snapshot_to_services(
            snapshot=snapshot,
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            set_as_current=True  # Set as current active composition
        )

        if not success:
            raise ServiceError(f"Failed to restore composition {composition_id} to services")

        logger.info(f"✅ Loaded and activated composition: {snapshot.name} (ID: {composition_id})")

        return snapshot
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load composition: {e}")
        raise ServiceError(f"Failed to load composition: {str(e)}")


@router.put("/{composition_id}")
async def update_composition(
    composition_id: str,
    request: UpdateCompositionRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service),
):
    """
    Update composition metadata (name, tempo, time signature)

    This updates the composition's properties without saving to disk.
    Call /save to persist changes.
    """
    try:
        # Get sequence (composition contains ONE sequence)
        sequence = sequencer_service.get_sequence(composition_id)
        if not sequence:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Update fields
        if request.name is not None:
            sequence.name = request.name
        if request.tempo is not None:
            sequence.tempo = request.tempo
        if request.time_signature is not None:
            sequence.time_signature = request.time_signature

        logger.info(f"✅ Updated composition {composition_id} metadata")

        return {
            "status": "ok",
            "message": f"Composition {composition_id} updated",
            "composition_id": composition_id
        }

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update composition: {e}")
        raise ServiceError(f"Failed to update composition: {str(e)}")


@router.delete("/{composition_id}", response_model=CompositionDeletedResponse)
async def delete_composition(
    composition_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    composition_service: CompositionService = Depends(get_composition_service)
):
    """
    Delete composition

    This removes the composition from memory AND deletes all files from disk
    (current.json, autosave.json, history/).
    """
    try:
        # Delete from memory
        success = sequencer_service.delete_sequence(composition_id)
        if not success:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Delete composition files from disk
        composition_service.delete_composition(composition_id)

        logger.info(f"🗑️ Deleted composition {composition_id}")

        return CompositionDeletedResponse(
            composition_id=composition_id,
            message=f"Composition {composition_id} deleted successfully"
        )

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete composition: {e}")
        raise ServiceError(f"Failed to delete composition: {str(e)}")


@router.get("/{composition_id}/chat-history")
async def get_composition_chat_history(
    composition_id: str,
    ai_agent_service: AIAgentService = Depends(get_ai_agent_service)
):
    """
    Get chat history for a composition

    Returns the conversation history between user and AI for this composition.
    """
    try:
        chat_history = ai_agent_service.chat_histories.get(composition_id, [])
        return {"chat_history": chat_history}
    except Exception as e:
        logger.error(f"❌ Failed to get chat history: {e}")
        raise ServiceError(f"Failed to get chat history: {str(e)}")

