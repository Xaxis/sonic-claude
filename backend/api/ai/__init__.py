"""
AI API - Modular router combining all AI endpoints

This module organizes AI routes into logical groups:
- chat: Chat endpoint for AI-DAW interaction
- state: DAW state and context endpoints
- actions: Execute AI-generated actions
"""
from fastapi import APIRouter

from . import chat, state, actions

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(chat.router, tags=["AI Agent"])
router.include_router(state.router, tags=["AI Agent"])
router.include_router(actions.router, tags=["AI Agent"])

