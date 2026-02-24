"""
Assistant Action Operations - Execute assistant-generated actions

This module handles execution of assistant-generated DAW actions.

NOTE: Individual actions (create_track, add_clip, etc.) already have push_undo()
in their respective endpoints, so undo/redo is automatically handled.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException

from backend.core.dependencies import get_daw_action_service
from backend.services.ai.action_executor_service import DAWActionService
from backend.models.ai_actions import DAWAction, BatchActionRequest, BatchActionResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# ACTION ENDPOINTS
# ============================================================================

@router.post("/action")
async def execute_action(
    action: DAWAction,
    action_service: DAWActionService = Depends(get_daw_action_service)
):
    """
    Execute a single AI-generated action

    NOTE: Undo is handled automatically by the underlying endpoints
    (create_track, add_clip, etc.) which all call push_undo() before mutations.
    """
    result = await action_service.execute_action(action)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result


@router.post("/actions/batch", response_model=BatchActionResponse)
async def execute_batch_actions(
    request: BatchActionRequest,
    action_service: DAWActionService = Depends(get_daw_action_service)
):
    """
    Execute multiple actions atomically

    NOTE: Undo is handled automatically by the underlying endpoints.
    Each action in the batch will create its own undo entry.
    """
    return await action_service.execute_batch(request)

