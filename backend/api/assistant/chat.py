"""
Assistant Chat Operations - Chat endpoint for assistant-DAW interaction

This module handles chat interactions with the assistant agent.
"""
import logging
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.core.dependencies import get_ai_agent_service
from backend.services.ai.agent_service import AIAgentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ChatRequest(BaseModel):
    """Chat message request with optional per-request AI preferences."""
    message: str
    stream: bool = False

    # ── AI preferences (all optional; agent_service uses its defaults when absent) ──
    execution_model: Optional[Literal["haiku", "sonnet", "opus"]] = None
    """Which Claude model executes this request. None = use server default (sonnet)."""

    temperature: Optional[float] = Field(None, ge=0.0, le=1.0)
    """Creativity / temperature (0 = precise, 1 = highly creative). None = use default."""

    response_style: Literal["concise", "balanced", "detailed"] = "balanced"
    """Controls AI verbosity: concise = 1-2 sentences, detailed = full reasoning."""

    history_length: int = Field(6, ge=2, le=20)
    """Number of recent chat messages included as context (2–20)."""

    use_intent_routing: bool = True
    """Use smart intent routing to load only relevant tools. False = all tools."""

    include_harmonic_context: bool = True
    """Include harmonic analysis (key, chords, scale) in AI context."""

    include_rhythmic_context: bool = True
    """Include rhythmic analysis (groove, timing, syncopation) in AI context."""

    include_timbre_context: bool = True
    """Include timbral/energy analysis (brightness, loudness) in AI context."""


class ChatResponse(BaseModel):
    """Chat message response"""
    response: str
    actions_executed: list = []
    musical_context: str | None = None
    routing_intent: str | None = None  # Detected intent category, if routing was used


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """
    Send message to AI agent with optional per-request preferences.

    The AI accepts vague, creative commands like:
    - "Make this more ambient"
    - "Add tension to the drums"
    - "Recompose as jazz"
    - "Add variation"

    The AI will:
    1. (Optionally) route to the relevant intent
    2. Load focused tools for that intent
    3. Analyse current DAW state with the requested context depth
    4. Generate response and execute actions
    """
    try:
        if not ai_service.client:
            raise HTTPException(
                status_code=503,
                detail="AI service not available. Set AI_ANTHROPIC_API_KEY in your .env file at the project root."
            )

        response_dict = await ai_service.send_message(
            request.message,
            execution_model=request.execution_model,
            temperature=request.temperature,
            response_style=request.response_style,
            history_length=request.history_length,
            use_intent_routing=request.use_intent_routing,
            include_harmonic_context=request.include_harmonic_context,
            include_rhythmic_context=request.include_rhythmic_context,
            include_timbre_context=request.include_timbre_context,
        )

        return ChatResponse(
            response=response_dict["response"],
            actions_executed=response_dict.get("actions_executed", []),
            musical_context=response_dict.get("musical_context"),
            routing_intent=response_dict.get("routing_intent"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

