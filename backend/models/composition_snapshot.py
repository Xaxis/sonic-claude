"""
Composition Snapshot Models - Complete DAW state for AI iterations

A composition snapshot captures EVERYTHING needed to restore the exact state:
- Composition (tracks, clips, tempo, time signature, loop settings)
- Mixer state (all channels, volumes, pans, mutes, solos, master)
- Effects (all track effect chains with parameters)
- Sample assignments
- UI state (zoom, grid, selected clips, etc.)

This enables true reversible iterations where users can navigate
backward/forward through AI transformations with complete state restoration.
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from backend.models.sequence import SequencerTrack, Clip
from backend.models.mixer import MixerState, MixerChannel, MasterChannel
from backend.models.effects import EffectInstance, TrackEffectChain


class ChatMessage(BaseModel):
    """A single chat message in the conversation history"""
    role: str = Field(description="Message role: 'user' or 'assistant'")
    content: str = Field(description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    actions_executed: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Actions executed (for assistant messages)"
    )


class CompositionSnapshot(BaseModel):
    """
    Complete composition state snapshot

    This captures EVERYTHING needed to restore the exact state of a composition:
    - All composition data (tracks, clips, tempo, etc.)
    - All mixer state (channels, volumes, pans, etc.)
    - All effects (track effect chains with parameters)
    - All sample assignments
    - UI state (zoom, grid, selected clips, etc.)
    - Chat history (all AI conversations)
    """
    # === COMPOSITION IDENTITY ===
    id: str = Field(description="Composition ID (snapshot ID = composition ID)")
    name: str = Field(description="Composition name")

    # === COMPOSITION TIMELINE ===
    tempo: float = Field(default=120.0, description="Tempo in BPM")
    time_signature: str = Field(default="4/4", description="Time signature")
    tracks: List[SequencerTrack] = Field(default_factory=list, description="All tracks")
    clips: List[Clip] = Field(default_factory=list, description="All clips")

    # === PLAYBACK STATE ===
    is_playing: bool = Field(default=False, description="Is composition playing")
    current_position: float = Field(default=0.0, description="Current playhead position in beats")

    # === LOOP SETTINGS ===
    loop_enabled: bool = Field(default=False, description="Is looping enabled")
    loop_start: float = Field(default=0.0, description="Loop start position in beats")
    loop_end: float = Field(default=16.0, description="Loop end position in beats")

    # === MIXER STATE ===
    mixer_state: MixerState = Field(default_factory=MixerState, description="Complete mixer state")

    # === EFFECTS STATE ===
    track_effects: List[TrackEffectChain] = Field(
        default_factory=list,
        description="All track effect chains"
    )

    # === SAMPLE ASSIGNMENTS ===
    # Map of track_id -> sample_file_path for sample tracks
    sample_assignments: Dict[str, str] = Field(
        default_factory=dict,
        description="Sample file assignments for sample tracks"
    )

    # === CHAT HISTORY ===
    chat_history: List[ChatMessage] = Field(
        default_factory=list,
        description="Complete conversation history with AI"
    )

    # === METADATA ===
    # Store any additional metadata that might be useful
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata (e.g., AI prompt, user notes)"
    )

    # === TIMESTAMPS ===
    created_at: datetime = Field(default_factory=datetime.now, description="When composition was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="When composition was last updated")


class AIIteration(BaseModel):
    """
    A single AI iteration - represents a complete composition state
    created by an AI transformation
    """
    id: str = Field(description="Unique iteration ID")
    iteration_number: int = Field(description="Sequential iteration number (0 = original, 1, 2, 3...)")
    
    # AI context
    user_prompt: str = Field(description="User's original request")
    ai_response: str = Field(description="AI's explanation of changes")
    actions_executed: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Actions executed by AI"
    )
    
    # Complete composition snapshot
    snapshot: CompositionSnapshot = Field(description="Complete composition state")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Preview info (for UI display)
    summary: str = Field(default="", description="Brief summary of changes")


class IterationHistory(BaseModel):
    """
    Complete iteration history for a sequence
    
    This tracks all AI iterations and allows navigation backward/forward
    """
    sequence_id: str = Field(description="Parent sequence ID")
    current_iteration: int = Field(
        default=0,
        description="Current iteration index (0 = original)"
    )
    iterations: List[AIIteration] = Field(
        default_factory=list,
        description="All iterations (index 0 = original state)"
    )
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# === API REQUEST/RESPONSE MODELS ===

class CreateIterationRequest(BaseModel):
    """Request to create a new iteration"""
    sequence_id: str
    user_prompt: str
    ai_response: str
    actions_executed: List[Dict[str, Any]]
    summary: Optional[str] = None


class NavigateIterationRequest(BaseModel):
    """Request to navigate to a specific iteration"""
    sequence_id: str
    iteration_number: int = Field(ge=0, description="Iteration to navigate to (0 = original)")


class IterationListResponse(BaseModel):
    """Response with list of iterations"""
    sequence_id: str
    current_iteration: int
    total_iterations: int
    iterations: List[AIIteration]


class RestoreIterationResponse(BaseModel):
    """Response after restoring an iteration"""
    success: bool
    iteration_number: int
    message: str
    snapshot: Optional[CompositionSnapshot] = None

