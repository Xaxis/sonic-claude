"""
Assistant Contextual Chat Operations - Context-aware inline AI editing

This module handles contextual chat interactions where the AI is scoped to a specific
entity (track, clip, effect, mixer channel) within the composition.

The AI receives:
1. Full composition context (for understanding the bigger picture)
2. Focused entity context (the specific thing being edited)
3. User's natural language request

This enables inline editing like:
- Right-click track → "Make this more ambient"
- Right-click clip → "Add more variation to the melody"
- Right-click effect → "Adjust this to sound warmer"
- Right-click mixer channel → "Balance this better with the drums"
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, Any

from backend.core.dependencies import get_ai_agent_service
from backend.services.ai.agent_service import AIAgentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ContextualChatRequest(BaseModel):
    """Contextual chat message request with entity scope"""
    message: str = Field(..., description="User's natural language request")
    
    # Entity context
    entity_type: Literal["track", "clip", "effect", "mixer_channel", "composition"] = Field(
        ...,
        description="Type of entity being edited"
    )
    entity_id: str = Field(..., description="ID of the specific entity")
    composition_id: str = Field(..., description="ID of the composition")
    
    # Optional additional context
    additional_context: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional context (e.g., current parameter values, related entities)"
    )


class ContextualChatResponse(BaseModel):
    """Contextual chat message response"""
    response: str = Field(..., description="AI's response message")
    actions_executed: list = Field(default_factory=list, description="Actions executed")
    entity_type: str = Field(..., description="Type of entity that was modified")
    entity_id: str = Field(..., description="ID of the entity that was modified")
    affected_entities: list[Dict[str, str]] = Field(
        default_factory=list,
        description="List of all entities affected by the actions (for highlighting)"
    )
    musical_context: Optional[str] = Field(None, description="Full musical analysis")


# ============================================================================
# CONTEXTUAL CHAT ENDPOINTS
# ============================================================================

@router.post("/contextual-chat", response_model=ContextualChatResponse)
async def contextual_chat(
    request: ContextualChatRequest,
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """
    Send contextual message to AI agent scoped to a specific entity
    
    This endpoint enables inline AI editing where the user can right-click
    on any entity (track, clip, effect, mixer channel) and ask the AI to
    modify it with natural language.
    
    Examples:
    - Track: "Make this more ambient", "Add a bassline", "Increase energy"
    - Clip: "Add variation", "Make it more rhythmic", "Transpose up an octave"
    - Effect: "Make it warmer", "Add more reverb", "Reduce harshness"
    - Mixer: "Balance with drums", "Make it louder", "Pan left"
    
    The AI will:
    1. Analyze the full composition context
    2. Focus on the specific entity
    3. Understand the user's request
    4. Execute scoped actions
    5. Return affected entities for visual highlighting
    """
    try:
        if not ai_service.client:
            raise HTTPException(
                status_code=503,
                detail="AI service not available. Set AI_ANTHROPIC_API_KEY in your .env file at the project root."
            )

        # Send contextual message to AI service
        response_dict = await ai_service.send_contextual_message(
            message=request.message,
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            composition_id=request.composition_id,
            additional_context=request.additional_context
        )

        return ContextualChatResponse(
            response=response_dict["response"],
            actions_executed=response_dict.get("actions_executed", []),
            entity_type=request.entity_type,
            entity_id=request.entity_id,
            affected_entities=response_dict.get("affected_entities", []),
            musical_context=response_dict.get("musical_context")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contextual chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

