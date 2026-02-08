"""
AI agent models
"""
from pydantic import BaseModel, Field
from typing import List
from .audio import AudioAnalysis
from .musical import MusicalState, Decision


class AIStatus(BaseModel):
    """Complete AI agent status"""
    is_running: bool = Field(..., description="Whether AI agent is active")
    audio_analysis: AudioAnalysis = Field(..., description="Current audio analysis")
    current_state: MusicalState = Field(..., description="Current musical state")
    recent_decisions: List[Decision] = Field(default_factory=list, description="Recent AI decisions")
    frequency_spectrum: List[float] = Field(default_factory=list, description="Frequency spectrum bins")
    llm_reasoning: str = Field(default="", description="Latest LLM reasoning text")


class ChatRequest(BaseModel):
    """User chat message to AI"""
    message: str = Field(..., min_length=1, max_length=1000, description="User message")


class ChatResponse(BaseModel):
    """AI response to user chat"""
    response: str = Field(..., description="AI assistant response")
    reasoning: str = Field(default="", description="Internal reasoning (optional)")
    actions_taken: List[str] = Field(default_factory=list, description="List of actions performed")

