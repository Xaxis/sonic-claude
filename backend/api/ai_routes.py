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
    actions_executed: int = 0


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """
    Send message to AI agent
    
    The AI will:
    1. Analyze current DAW state
    2. Understand user request
    3. Generate response and/or actions
    4. Execute actions automatically
    """
    try:
        response = await ai_service.send_message(request.message)

        return ChatResponse(
            response=response,
            actions_executed=ai_service.last_actions_executed
        )
    
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AUTONOMOUS MODE ENDPOINTS
# ============================================================================

class AutonomousConfig(BaseModel):
    """Autonomous mode configuration"""
    enabled: bool
    interval_seconds: float = 10.0
    min_call_interval: float = 2.0


@router.post("/autonomous/start")
async def start_autonomous_mode(
    config: AutonomousConfig,
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """
    Start autonomous mode
    
    AI will periodically:
    - Analyze current state
    - Suggest improvements
    - Execute actions (if enabled)
    """
    ai_service.autonomous_interval = config.interval_seconds
    ai_service.min_call_interval = config.min_call_interval
    ai_service.start_autonomous_mode()
    
    return {"status": "started", "config": config}


@router.post("/autonomous/stop")
async def stop_autonomous_mode(
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """Stop autonomous mode"""
    ai_service.stop_autonomous_mode()
    return {"status": "stopped"}


@router.get("/autonomous/status")
async def get_autonomous_status(
    ai_service: AIAgentService = Depends(get_ai_agent_service)
):
    """Get autonomous mode status"""
    return {
        "enabled": ai_service.autonomous_mode,
        "interval": ai_service.autonomous_interval,
        "last_call": ai_service.last_call_time.isoformat() if ai_service.last_call_time else None
    }

