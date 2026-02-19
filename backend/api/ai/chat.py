"""
AI Chat Operations - Chat endpoint for AI-DAW interaction

This module handles chat interactions with the AI agent.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.core.dependencies import get_ai_agent_service
from backend.services.ai_agent_service import AIAgentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
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


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

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

