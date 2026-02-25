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
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_composition_service,
    get_composition_state_service,
    get_mixer_service,
    get_track_effects_service,
    get_ai_agent_service,
)
from backend.services.daw.composition_service import CompositionService
from backend.services.daw.composition_state_service import CompositionStateService
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

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("/", response_model=CompositionCreatedResponse)
async def create_composition(
    request: CreateCompositionRequest,
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Create a new composition (project)

    This is the PRIMARY way to create a new project. It:
    1. Creates a new composition with unique ID
    2. Initializes mixer state
    3. Saves initial composition to disk
    4. Returns composition ID
    """
    try:
        # Create composition in sequencer service
        composition = composition_state_service.create_composition(
            name=request.name,
            tempo=request.tempo or 120.0,
            time_signature=request.time_signature or "4/4"
        )

        # Capture current state into composition
        composition = composition_service.capture_composition_from_services(
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            composition_id=composition.id
        )

        if not composition:
            raise ServiceError(f"Failed to capture composition state for {composition.id}")

        # Add initial metadata
        composition.metadata = {"source": "create_composition", "initial": True}

        # Save initial composition to disk
        composition_service.save_composition(
            composition=composition,
            create_history=True,  # Create initial history entry
            is_autosave=False
        )

        logger.info(f"✅ Created composition: {request.name} (ID: {composition.id})")

        return CompositionCreatedResponse(
            composition_id=composition.id,
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
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Save composition to disk

    This captures the complete current state and saves it.
    Optionally creates a history entry for versioning.
    """
    try:
        # Capture current state into composition
        composition = composition_service.capture_composition_from_services(
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            composition_id=composition_id
        )

        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Add metadata
        composition.metadata = request.metadata or {"source": "manual_save" if not request.is_autosave else "autosave"}

        # Save composition
        composition_service.save_composition(
            composition=composition,
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
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Load composition by ID

    This:
    1. Loads the composition from disk
    2. Restores it to all backend services (sequencer, mixer, effects)
    3. Sets it as the current active composition
    4. Returns the complete composition to the frontend

    This is what you call to "open" a composition.
    """
    try:
        composition = composition_service.load_composition(composition_id, use_autosave=use_autosave)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Restore the composition to backend services
        success = await composition_service.restore_composition_to_services(
            composition=composition,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            set_as_current=True  # Set as current active composition
        )

        if not success:
            raise ServiceError(f"Failed to restore composition {composition_id} to services")

        # Verify current_composition_id was set
        logger.info(f"✅ Loaded and activated composition: {composition.name} (ID: {composition_id})")
        logger.info(f"🔍 Current composition ID in state service: {composition_state_service.current_composition_id}")

        return composition
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load composition: {e}")
        raise ServiceError(f"Failed to load composition: {str(e)}")


@router.put("/{composition_id}")
async def update_composition(
    composition_id: str,
    request: UpdateCompositionRequest,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """
    Update composition metadata (name, tempo, time signature)

    This updates the composition's properties and auto-persists to disk.
    """
    try:
        # Get composition
        composition = composition_state_service.get_composition(composition_id)
        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # UNDO: Push current state to undo stack BEFORE mutation
        composition_state_service.push_undo(composition_id)

        # Update fields
        if request.name is not None:
            composition.name = request.name
        if request.tempo is not None:
            composition.tempo = request.tempo
        if request.time_signature is not None:
            composition.time_signature = request.time_signature

        # AUTO-PERSIST: Keep current.json in sync with memory
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

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


@router.post("/{composition_id}/snapshot")
async def create_history_snapshot(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Create a history snapshot of current state (for undo/redo)

    This captures the current composition state and saves it as a history entry.
    Used before undoable mutations to enable undo/redo.
    """
    try:
        # Capture current state
        composition = composition_service.capture_composition_from_services(
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            composition_id=composition_id
        )

        if not composition:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")

        # Save with history entry
        composition_service.save_composition(
            composition=composition,
            create_history=True,
            is_autosave=False
        )

        logger.info(f"📸 Created history snapshot for composition {composition_id}")

        return {
            "status": "ok",
            "message": f"Created history snapshot for {composition_id}",
            "composition_id": composition_id
        }

    except Exception as e:
        logger.error(f"❌ Failed to create history snapshot: {e}")
        raise ServiceError(f"Failed to create history snapshot: {str(e)}")


@router.delete("/{composition_id}", response_model=CompositionDeletedResponse)
async def delete_composition(
    composition_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service)
):
    """
    Delete composition

    This removes the composition from memory AND deletes all files from disk
    (current.json, autosave.json, history/).
    """
    try:
        # Delete from memory
        success = composition_state_service.delete_composition(composition_id)
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


# ============================================================================
# UNDO/REDO ENDPOINTS (BUILT-IN)
# ============================================================================

@router.post("/{composition_id}/undo")
async def undo_composition(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Undo to previous composition state

    This uses the built-in undo stack in CompositionStateService.
    Returns the full composition state so frontend can update all UI.
    """
    try:
        # Undo to previous state
        previous_state = composition_state_service.undo(composition_id)
        if not previous_state:
            raise ServiceError("Nothing to undo")

        # Restore to all services
        success = composition_service.restore_composition_to_services(
            composition=previous_state,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            set_as_current=True
        )

        if not success:
            raise ServiceError("Failed to restore composition to services")

        # Auto-persist to current.json (no history entry)
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        # Get stack sizes for response
        undo_size, redo_size = composition_state_service.get_undo_redo_sizes(composition_id)

        logger.info(f"⏪ Undone composition {composition_id} (undo: {undo_size}, redo: {redo_size})")

        return {
            "status": "ok",
            "message": "Undone successfully",
            "composition": previous_state,
            "can_undo": undo_size > 0,
            "can_redo": redo_size > 0
        }

    except ServiceError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to undo: {e}")
        raise ServiceError(f"Failed to undo: {str(e)}")


@router.post("/{composition_id}/redo")
async def redo_composition(
    composition_id: str,
    composition_service: CompositionService = Depends(get_composition_service),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Redo to next composition state

    This uses the built-in redo stack in CompositionStateService.
    Returns the full composition state so frontend can update all UI.
    """
    try:
        # Redo to next state
        next_state = composition_state_service.redo(composition_id)
        if not next_state:
            raise ServiceError("Nothing to redo")

        # Restore to all services
        success = composition_service.restore_composition_to_services(
            composition=next_state,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            set_as_current=True
        )

        if not success:
            raise ServiceError("Failed to restore composition to services")

        # Auto-persist to current.json (no history entry)
        composition_service.auto_persist_composition(
            composition_id=composition_id,
            composition_state_service=composition_state_service,
            mixer_service=mixer_service,
            effects_service=effects_service
        )

        # Get stack sizes for response
        undo_size, redo_size = composition_state_service.get_undo_redo_sizes(composition_id)

        logger.info(f"⏩ Redone composition {composition_id} (undo: {undo_size}, redo: {redo_size})")

        return {
            "status": "ok",
            "message": "Redone successfully",
            "composition": next_state,
            "can_undo": undo_size > 0,
            "can_redo": redo_size > 0
        }

    except ServiceError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to redo: {e}")
        raise ServiceError(f"Failed to redo: {str(e)}")


@router.get("/{composition_id}/undo-redo-status")
async def get_undo_redo_status(
    composition_id: str,
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
):
    """
    Get undo/redo availability status

    Returns whether undo/redo are available for this composition.
    """
    try:
        undo_size, redo_size = composition_state_service.get_undo_redo_sizes(composition_id)

        return {
            "can_undo": undo_size > 0,
            "can_redo": redo_size > 0,
            "undo_stack_size": undo_size,
            "redo_stack_size": redo_size
        }

    except Exception as e:
        logger.error(f"❌ Failed to get undo/redo status: {e}")
        raise ServiceError(f"Failed to get undo/redo status: {str(e)}")

