"""
AI State Operations - DAW state and context endpoints

This module handles DAW state retrieval and AI context generation.
"""
import logging
from fastapi import APIRouter, Depends

from backend.core.dependencies import (
    get_ai_agent_service,
    get_daw_state_service
)
from backend.services.ai_agent_service import AIAgentService
from backend.services.daw_state_service import DAWStateService
from backend.models.daw_state import GetStateRequest, GetStateResponse, StateDetailLevel

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# STATE ENDPOINTS
# ============================================================================

@router.post("/state", response_model=GetStateResponse)
async def get_daw_state(
    request: GetStateRequest = GetStateRequest(),
    state_service: DAWStateService = Depends(get_daw_state_service)
):
    """
    Get current DAW state with optional diff detection

    Efficiency features:
    - Returns diff if previous_hash matches
    - Configurable detail level to reduce payload
    - Cached computation
    """
    return state_service.get_state(
        detail=request.detail,
        previous_hash=request.previous_hash
    )


@router.get("/context")
async def get_ai_context(
    ai_service: AIAgentService = Depends(get_ai_agent_service),
    state_service: DAWStateService = Depends(get_daw_state_service)
):
    """
    Get the EXACT context message that would be sent to the LLM

    This shows what the AI actually sees - useful for debugging and transparency.
    """
    # Get current state with full detail
    state_response = state_service.get_state(
        detail=StateDetailLevel(
            include_clips=True,
            include_notes=True,
            include_audio_analysis=True,
            include_musical_analysis=True,
            max_clips=None,
            max_notes_per_clip=None
        )
    )

    # Build the context message (same as what gets sent to LLM)
    context = ai_service._build_context_message(state_response.full_state)

    return {"context": context}

