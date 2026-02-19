"""
AI Agent API Routes - Endpoints for AI-DAW interaction

Performance considerations:
- Async endpoints for non-blocking execution
- Streaming responses for real-time feedback
- Rate limiting to prevent abuse
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.dependencies import (
    get_ai_agent_service,
    get_daw_state_service,
    get_daw_action_service
)
from backend.services.ai_agent_service import AIAgentService
from backend.services.daw_state_service import DAWStateService
from backend.services.daw_action_service import DAWActionService
from backend.models.daw_state import GetStateRequest, GetStateResponse, StateDetailLevel
from backend.models.ai_actions import DAWAction, BatchActionRequest, BatchActionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Agent"])


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


# ============================================================================
# ACTION ENDPOINTS
# ============================================================================

@router.post("/action")
async def execute_action(
    action: DAWAction,
    action_service: DAWActionService = Depends(get_daw_action_service)
):
    """Execute a single AI-generated action"""
    result = await action_service.execute_action(action)
    
    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)
    
    return result


@router.post("/actions/batch", response_model=BatchActionResponse)
async def execute_batch_actions(
    request: BatchActionRequest,
    action_service: DAWActionService = Depends(get_daw_action_service)
):
    """Execute multiple actions atomically"""
    return await action_service.execute_batch(request)


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

class ChatRequest(BaseModel):
    """Chat message request"""
    message: str
    stream: bool = False


class ChatResponse(BaseModel):
    """Chat message response"""
    response: str
    actions_executed: list = []
    musical_context: str | None = None  # The full musical analysis sent to LLM


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """
    Send ONE-SHOT message to AI agent (no conversation history)

    Each request is independent with fresh DAW state.

    The AI accepts vague, creative commands like:
    - "Make this more ambient"
    - "Add tension to the drums"
    - "Recompose as jazz"
    - "Add variation"

    The AI will:
    1. Analyze current DAW state (fresh)
    2. Understand user request
    3. Generate response and/or actions
    4. Execute actions automatically
    """
    try:
        if not ai_service.client:
            raise HTTPException(
                status_code=503,
                detail="AI service not available. Set AI_ANTHROPIC_API_KEY in your .env file at the project root."
            )

        response_dict = await ai_service.send_message(request.message)

        return ChatResponse(
            response=response_dict["response"],
            actions_executed=response_dict.get("actions_executed", []),
            musical_context=response_dict.get("musical_context")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))




