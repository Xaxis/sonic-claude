"""
Assistant Chat Operations - Chat endpoint for assistant-DAW interaction

This module handles chat interactions with the assistant agent.
"""
import json
import logging
from typing import Optional, Literal
import anthropic
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.core.dependencies import get_ai_agent_service
from backend.services.ai.agent_service import AIAgentService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# ERROR MESSAGES — shared between streaming and non-streaming paths
# ============================================================================

_MSG_RATE_LIMIT   = "AI rate limit reached. Please wait a moment before trying again."
_MSG_OVERLOADED   = "Anthropic AI is temporarily overloaded. Please try again in a few seconds."
_MSG_UNAVAILABLE  = "AI service not available. Set AI_ANTHROPIC_API_KEY in your .env file at the project root."


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

@router.post("/chat")
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

    Pass ``stream: true`` to receive a ``text/event-stream`` response with
    incremental SSE events instead of waiting for the full response.
    """
    if not ai_service.client:
        raise HTTPException(status_code=503, detail=_MSG_UNAVAILABLE)

    kwargs = dict(
        execution_model=request.execution_model,
        temperature=request.temperature,
        response_style=request.response_style,
        history_length=request.history_length,
        use_intent_routing=request.use_intent_routing,
        include_harmonic_context=request.include_harmonic_context,
        include_rhythmic_context=request.include_rhythmic_context,
        include_timbre_context=request.include_timbre_context,
    )

    # ── Streaming path ──────────────────────────────────────────────────────
    if request.stream:
        async def generate_stream():
            try:
                async for event in ai_service.stream_message(request.message, **kwargs):
                    yield event
            except anthropic.RateLimitError:
                yield f"data: {json.dumps({'type': 'error', 'code': 429, 'detail': _MSG_RATE_LIMIT})}\n\n"
            except anthropic.InternalServerError as e:
                detail = _MSG_OVERLOADED if e.status_code == 529 else str(e)
                yield f"data: {json.dumps({'type': 'error', 'code': e.status_code, 'detail': detail})}\n\n"
            except Exception as e:
                logger.error(f"Stream error: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # ── Non-streaming path ──────────────────────────────────────────────────
    try:
        response_dict = await ai_service.send_message(request.message, **kwargs)
        return ChatResponse(
            response=response_dict["response"],
            actions_executed=response_dict.get("actions_executed", []),
            musical_context=response_dict.get("musical_context"),
            routing_intent=response_dict.get("routing_intent"),
        )
    except HTTPException:
        raise
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail=_MSG_RATE_LIMIT)
    except anthropic.InternalServerError as e:
        if e.status_code == 529:
            raise HTTPException(status_code=503, detail=_MSG_OVERLOADED)
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

