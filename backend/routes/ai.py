"""
AI agent API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from backend.models import AIStatus, ChatRequest, ChatResponse
from backend.core import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Agent"])

# These will be injected as dependencies
_ai_agent = None
_llm_agent = None


def set_ai_services(ai_agent, llm_agent):
    """Set AI service instances"""
    global _ai_agent, _llm_agent
    _ai_agent = ai_agent
    _llm_agent = llm_agent


@router.get("/status", response_model=AIStatus)
async def get_ai_status():
    """Get current AI agent status"""
    try:
        if not _ai_agent:
            raise HTTPException(status_code=503, detail="AI agent not initialized")
        
        status = _ai_agent.get_status()
        return AIStatus(**status)
    except Exception as e:
        logger.error(f"Error getting AI status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/toggle")
async def toggle_ai():
    """Toggle AI agent on/off"""
    try:
        if not _ai_agent:
            raise HTTPException(status_code=503, detail="AI agent not initialized")
        
        _ai_agent.is_running = not _ai_agent.is_running
        return {"enabled": _ai_agent.is_running}
    except Exception as e:
        logger.error(f"Error toggling AI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Send a message to the AI agent - also triggers autonomous decision making"""
    try:
        if not _llm_agent:
            raise HTTPException(status_code=503, detail="LLM agent not initialized")

        if not _ai_agent:
            raise HTTPException(status_code=503, detail="AI agent not initialized")

        # Get current audio context
        status = _ai_agent.get_status()
        audio_context = {
            "audio_analysis": status.get("audio_analysis", {}),
            "current_state": status.get("current_state", {}),
        }

        # Process message with LLM
        response, reasoning = await _llm_agent.process_user_message(
            request.message,
            audio_context
        )

        # Also make autonomous decisions based on current audio
        decisions = await _ai_agent.analyze_and_decide(_ai_agent.latest_audio)

        # Execute high-confidence decisions
        actions_taken = []
        for decision in decisions[:2]:
            if decision.confidence > 0.6:
                await _ai_agent._execute_decision(decision)
                actions_taken.append(f"{decision.parameter}={decision.value}")

        return ChatResponse(
            response=response,
            reasoning=reasoning,
            actions_taken=actions_taken
        )
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

