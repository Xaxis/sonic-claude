"""
Assistant API - Modular router combining all assistant endpoints

This module organizes assistant routes into logical groups:
- chat: Chat endpoint for assistant-DAW interaction
- contextual_chat: Context-aware inline AI editing
- state: DAW state and context endpoints
- actions: Execute assistant-generated actions
"""
from fastapi import APIRouter

from . import chat, contextual_chat, state, actions

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(chat.router, tags=["assistant"])
router.include_router(contextual_chat.router, tags=["assistant"])
router.include_router(state.router, tags=["assistant"])
router.include_router(actions.router, tags=["assistant"])

