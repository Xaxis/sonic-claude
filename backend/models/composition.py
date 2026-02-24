"""
Composition Models - The PRIMARY and ONLY entity in the DAW

A Composition IS a PROJECT (like .als in Ableton, .logicx in Logic Pro).
It contains EVERYTHING needed to recreate the exact state:
- Timeline: tracks, clips, tempo, time signature, loop settings
- Playback state: is_playing, current_position
- Audio: mixer_state, track_effects, sample_assignments
- AI Context: chat_history, metadata
- Timestamps: created_at, updated_at

This is the COMPLETE project state. There is no separate "Snapshot" model.
For versioning/history, we simply save multiple versions of Composition.

Key Concepts:
- Composition = The COMPLETE project (no separate "Sequence" or "Snapshot")
- ONE ID = composition_id
- Composition is stored in CompositionStateService.compositions dict
- CompositionService handles persistence (save/load Composition directly)
- For history: save multiple versions of the same Composition
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from backend.models.sequence import Track, Clip
from backend.models.mixer import MixerState
from backend.models.effects import TrackEffectChain


class ChatMessage(BaseModel):
    """A single chat message in the conversation history"""
    role: str = Field(description="Message role: 'user' or 'assistant'")
    content: str = Field(description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    actions_executed: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Actions executed (for assistant messages)"
    )


class Scene(BaseModel):
    """Scene definition for clip launcher - triggers a horizontal row of clips"""
    id: str = Field(description="Unique scene ID")
    name: str = Field(description="Scene name (e.g., 'Intro', 'Verse', 'Chorus')")
    color: str = Field(default="#f39c12", description="Scene color for UI")
    tempo: Optional[float] = Field(
        default=None,
        gt=0,
        le=300,
        description="Optional tempo override when scene is launched"
    )


class Composition(BaseModel):
    """
    Complete composition - THE COMPLETE project state

    This is the ONLY entity. There is no separate "Sequence" or "Snapshot".
    A composition contains EVERYTHING needed to recreate the exact state.
    """
    # === IDENTITY ===
    id: str = Field(description="Unique composition ID")
    name: str = Field(description="Composition name")

    # === TIMELINE ===
    tempo: float = Field(default=120.0, gt=0, le=300, description="Tempo in BPM")
    time_signature: str = Field(default="4/4", pattern=r"^\d+/\d+$", description="Time signature")
    tracks: List[Track] = Field(default_factory=list, description="All tracks in composition")
    clips: List[Clip] = Field(default_factory=list, description="All clips in composition")

    # === PLAYBACK STATE ===
    is_playing: bool = Field(default=False, description="Whether composition is playing")
    current_position: float = Field(default=0.0, ge=0, description="Playhead position in beats")

    # === LOOP SETTINGS ===
    loop_enabled: bool = Field(default=False, description="Whether looping is enabled")
    loop_start: float = Field(default=0.0, ge=0, description="Loop start position in beats")
    loop_end: float = Field(default=16.0, gt=0, description="Loop end position in beats")

    # === AUDIO STATE ===
    mixer_state: MixerState = Field(default_factory=MixerState, description="Complete mixer state")
    track_effects: List[TrackEffectChain] = Field(
        default_factory=list,
        description="All track effect chains"
    )
    sample_assignments: Dict[str, str] = Field(
        default_factory=dict,
        description="Sample file assignments for sample tracks (track_id -> sample_path)"
    )

    # === CLIP LAUNCHER (Performance Mode) ===
    clip_slots: Optional[List[List[Optional[str]]]] = Field(
        default=None,
        description="2D array of clip IDs [trackIndex][slotIndex]. null = empty slot"
    )
    scenes: List[Scene] = Field(
        default_factory=list,
        description="Scene definitions for horizontal triggering"
    )
    launch_quantization: str = Field(
        default="1",
        description="Launch quantization: 'none', '1/4', '1/2', '1', '2', '4' bars"
    )

    # === AI CONTEXT ===
    chat_history: List[ChatMessage] = Field(
        default_factory=list,
        description="Complete conversation history with AI"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata (e.g., AI prompt, user notes, tags)"
    )

    # === TIMESTAMPS ===
    created_at: datetime = Field(default_factory=datetime.now, description="When composition was created")
    updated_at: datetime = Field(default_factory=datetime.now, description="When composition was last updated")


class CompositionMetadata(BaseModel):
    """
    Composition metadata - lightweight info for listing/browsing

    This is what gets returned when listing all compositions.
    """
    id: str = Field(description="Unique composition ID")
    name: str = Field(description="Composition name")
    tempo: float = Field(default=120.0, gt=0, le=300, description="Tempo in BPM")
    time_signature: str = Field(default="4/4", pattern=r"^\d+/\d+$", description="Time signature")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    # Stats (for UI display)
    track_count: int = Field(default=0, ge=0, description="Number of tracks")
    clip_count: int = Field(default=0, ge=0, description="Number of clips")
    duration_beats: float = Field(default=0.0, ge=0, description="Total duration in beats")

    # File info
    file_size_bytes: Optional[int] = Field(default=None, description="File size in bytes")
    has_autosave: bool = Field(default=False, description="Whether autosave exists")


class CreateCompositionRequest(BaseModel):
    """Request to create a new composition (project)"""
    name: str = Field(description="Composition name")
    tempo: Optional[float] = Field(default=120.0, gt=0, le=300, description="Initial tempo")
    time_signature: Optional[str] = Field(default="4/4", pattern=r"^\d+/\d+$", description="Initial time signature")


class UpdateCompositionRequest(BaseModel):
    """Request to update composition metadata"""
    name: Optional[str] = Field(default=None, description="New composition name")
    tempo: Optional[float] = Field(default=None, gt=0, le=300, description="New tempo")
    time_signature: Optional[str] = Field(default=None, pattern=r"^\d+/\d+$", description="New time signature")


class SaveCompositionRequest(BaseModel):
    """Request to save a composition"""
    composition_id: str = Field(description="Composition ID to save")
    create_history: bool = Field(default=True, description="Whether to create a history entry")
    is_autosave: bool = Field(default=False, description="Whether this is an autosave")
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")


class CompositionListResponse(BaseModel):
    """Response with list of compositions"""
    compositions: list[CompositionMetadata] = Field(description="List of all compositions")
    total: int = Field(description="Total number of compositions")


class CompositionCreatedResponse(BaseModel):
    """Response after creating a composition"""
    composition_id: str = Field(description="ID of created composition")
    name: str = Field(description="Composition name")
    message: str = Field(description="Success message")


class CompositionSavedResponse(BaseModel):
    """Response after saving a composition"""
    composition_id: str = Field(description="ID of saved composition")
    history_created: bool = Field(description="Whether a history entry was created")
    message: str = Field(description="Success message")


class CompositionDeletedResponse(BaseModel):
    """Response after deleting a composition"""
    composition_id: str = Field(description="ID of deleted composition")
    message: str = Field(description="Success message")

