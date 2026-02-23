"""
Composition Models - The PRIMARY and ONLY entity in the DAW

A Composition IS a PROJECT (like .als in Ableton, .logicx in Logic Pro).
It contains the TIMELINE DATA:
- Tracks and clips (the timeline)
- Tempo, time signature, loop settings
- Playback state (is_playing, current_position)
- Metadata (name, created/updated timestamps)

NOTE: Mixer state and Effects are stored GLOBALLY in their respective services,
NOT in the Composition model. When saving, CompositionSnapshot captures a snapshot
of the global mixer/effects state along with the composition timeline data.

Key Concepts:
- Composition = The ONLY entity (no separate "Sequence")
- ONE ID = composition_id
- Composition is stored in SequencerService.compositions dict
- CompositionService handles persistence only
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from backend.models.sequence import SequencerTrack, Clip


class Composition(BaseModel):
    """
    Complete composition - THE primary entity in the DAW

    This is the ONLY entity. There is no separate "Sequence".
    A composition contains everything needed for a project.
    """
    id: str = Field(description="Unique composition ID")
    name: str = Field(description="Composition name")
    tempo: float = Field(default=120.0, gt=0, le=300, description="Tempo in BPM")
    time_signature: str = Field(default="4/4", pattern=r"^\d+/\d+$", description="Time signature")

    # Timeline data
    tracks: List[SequencerTrack] = Field(default_factory=list, description="All tracks in composition")
    clips: List[Clip] = Field(default_factory=list, description="All clips in composition")

    # Playback state
    is_playing: bool = Field(default=False, description="Whether composition is playing")
    current_position: float = Field(default=0.0, ge=0, description="Playhead position in beats")

    # Loop settings
    loop_enabled: bool = Field(default=False, description="Whether looping is enabled")
    loop_start: float = Field(default=0.0, ge=0, description="Loop start position in beats")
    loop_end: float = Field(default=16.0, gt=0, description="Loop end position in beats")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


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

