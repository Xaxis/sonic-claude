"""
Composition CRUD Operations - Save, get, list, delete compositions

This module handles basic composition lifecycle operations.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.core.dependencies import (
    get_composition_service,
    get_sequencer_service,
    get_mixer_service,
    get_track_effects_service,
    get_ai_agent_service,
)
from backend.services.composition_service import CompositionService
from backend.services.sequencer_service import SequencerService
from backend.services.mixer_service import MixerService
from backend.services.track_effects_service import TrackEffectsService
from backend.services.ai_agent_service import AIAgentService
from backend.core.exceptions import ServiceError, ResourceNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class SaveCompositionRequest(BaseModel):
    """Request to save a composition"""
    sequence_id: str
    name: Optional[str] = None
    create_history: bool = True
    is_autosave: bool = False
    metadata: Optional[dict] = None


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post("/save")
async def save_composition(
    request: SaveCompositionRequest,
    composition_service: CompositionService = Depends(get_composition_service),
    sequencer_service: SequencerService = Depends(get_sequencer_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service),
):
    """
    Save complete composition state (sequence + mixer + effects)

    This creates a complete snapshot and optionally adds it to history.
    """
    try:
        # Get sequence
        sequence = sequencer_service.get_sequence(request.sequence_id)
        if not sequence:
            raise ResourceNotFoundError(f"Sequence {request.sequence_id} not found")

        # Build complete snapshot
        snapshot = composition_service.build_snapshot_from_services(
            sequencer_service=sequencer_service,
            mixer_service=mixer_service,
            effects_service=effects_service,
            sequence_id=request.sequence_id,
            name=request.name or sequence.name,
            metadata=request.metadata or {"source": "manual_save"}
        )

        if not snapshot:
            raise ServiceError(f"Failed to build snapshot for sequence {request.sequence_id}")

        # Save composition
        composition_service.save_composition(
            composition_id=request.sequence_id,
            snapshot=snapshot,
            create_history=request.create_history,
            is_autosave=request.is_autosave
        )

        logger.info(f"💾 Saved composition {request.sequence_id} (history={request.create_history})")

        return {
            "status": "ok",
            "message": f"Composition {request.sequence_id} saved",
            "composition_id": request.sequence_id,
            "history_created": request.create_history
        }

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to save composition: {e}")
        raise ServiceError(f"Failed to save composition: {str(e)}")


@router.get("/list")
async def list_compositions(
    composition_service: CompositionService = Depends(get_composition_service)
):
    """List all compositions"""
    try:
        compositions = composition_service.list_compositions()
        return {"compositions": compositions}
    except Exception as e:
        logger.error(f"❌ Failed to list compositions: {e}")
        raise ServiceError(f"Failed to list compositions: {str(e)}")


@router.get("/{composition_id}")
async def get_composition(
    composition_id: str,
    use_autosave: bool = False,
    composition_service: CompositionService = Depends(get_composition_service)
):
    """Get composition by ID"""
    try:
        snapshot = composition_service.load_composition(composition_id, use_autosave=use_autosave)
        if not snapshot:
            raise ResourceNotFoundError(f"Composition {composition_id} not found")
        return snapshot
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load composition: {e}")
        raise ServiceError(f"Failed to load composition: {str(e)}")


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

