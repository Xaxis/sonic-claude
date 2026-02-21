"""
Composition Models - The PRIMARY entity in the DAW

A Composition is a PROJECT (like .als in Ableton, .logicx in Logic Pro).
It contains EVERYTHING:
- ONE Sequence (the timeline with tracks and clips)
- Mixer state (all channels, master)
- Effects (all track effect chains)
- Sample assignments
- Metadata (name, tempo, time signature, created/updated timestamps)

Key Concepts:
- Composition = Project File (what users think about)
- Sequence = Internal data structure (implementation detail)
- Composition ID = Sequence ID (1:1 relationship)
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class CompositionMetadata(BaseModel):
    """
    Composition metadata - lightweight info for listing/browsing
    
    This is what gets returned when listing all compositions.
    """
    id: str = Field(description="Unique composition ID (same as sequence_id)")
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

