"""
AI agent API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from backend.models import AIStatus, ChatRequest, ChatResponse
from backend.core import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Agent"])

# Unified agent will be injected as dependency
_unified_agent = None


def set_ai_services(unified_agent):
    """Set unified AI agent instance"""
    global _unified_agent
    _unified_agent = unified_agent


@router.get("/status", response_model=AIStatus)
async def get_ai_status():
    """Get current AI agent status"""
    try:
        if not _unified_agent:
            raise HTTPException(status_code=503, detail="AI agent not initialized")

        status = _unified_agent.get_status()
        return AIStatus(**status)
    except Exception as e:
        logger.error(f"Error getting AI status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/toggle")
async def toggle_ai():
    """Toggle AI agent on/off"""
    try:
        if not _unified_agent:
            raise HTTPException(status_code=503, detail="AI agent not initialized")

        _unified_agent.is_running = not _unified_agent.is_running
        return {"enabled": _unified_agent.is_running}
    except Exception as e:
        logger.error(f"Error toggling AI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Send a message to the AI agent - also triggers autonomous decision making"""
    try:
        if not _unified_agent:
            raise HTTPException(status_code=503, detail="AI agent not initialized")

        # Get current audio context
        status = _unified_agent.get_status()
        audio_context = {
            "audio_analysis": status.get("audio_analysis", {}),
            "current_state": status.get("current_state", {}),
        }

        # Add spectral data if provided
        if request.spectral_data:
            audio_context["spectral_data"] = request.spectral_data

        # Process message with unified agent (handles both chat and decisions)
        response, reasoning = await _unified_agent.process_user_message(
            request.message,
            audio_context
        )

        # Also make autonomous decisions based on current audio
        decisions = await _unified_agent.analyze_and_decide(_unified_agent.latest_audio)

        # Execute high-confidence decisions
        actions_taken = []
        for decision in decisions[:2]:
            if decision.confidence > 0.6:
                await _unified_agent.execute_decision(decision)
                actions_taken.append(f"{decision.parameter}={decision.value}")

        return ChatResponse(
            response=response,
            reasoning=reasoning,
            actions_taken=actions_taken
        )
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

