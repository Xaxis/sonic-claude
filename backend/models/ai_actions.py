"""
AI Action Models - Structured actions for LLM tool calling

Design principles:
- Each action is a discrete, atomic operation
- Validation at the model level
- Clear success/failure responses
- Idempotent where possible
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


# ============================================================================
# ACTION DEFINITIONS (LLM Tools)
# ============================================================================

class CreateMIDIClipAction(BaseModel):
    """Create a new MIDI clip with notes"""
    action: Literal["create_midi_clip"] = "create_midi_clip"
    track_id: str
    start_time: float = Field(..., ge=0.0, description="Start time in beats")
    duration: float = Field(..., gt=0.0, description="Duration in beats")
    notes: List[Dict[str, Any]] = Field(..., description="List of notes: [{n: 60, s: 0, d: 1, v: 100}, ...]")
    name: Optional[str] = Field(None, description="Clip name (auto-generated if not provided)")


class ModifyClipAction(BaseModel):
    """Modify existing clip (notes, position, duration)"""
    action: Literal["modify_clip"] = "modify_clip"
    clip_id: str
    notes: Optional[List[Dict[str, Any]]] = Field(None, description="New notes (replaces existing)")
    start_time: Optional[float] = Field(None, ge=0.0, description="New start time")
    duration: Optional[float] = Field(None, gt=0.0, description="New duration")
    name: Optional[str] = None


class DeleteClipAction(BaseModel):
    """Delete a clip"""
    action: Literal["delete_clip"] = "delete_clip"
    clip_id: str


class CreateTrackAction(BaseModel):
    """Create a new track"""
    action: Literal["create_track"] = "create_track"
    name: str
    type: Literal["midi", "audio", "sample"]
    instrument: Optional[str] = Field(None, description="Instrument/synth name for MIDI tracks")
    color: Optional[str] = Field(None, description="Track color (hex)")


class SetTrackParameterAction(BaseModel):
    """Set track parameter (volume, pan, mute, solo)"""
    action: Literal["set_track_parameter"] = "set_track_parameter"
    track_id: str
    parameter: Literal["volume", "pan", "mute", "solo"]
    value: float | bool = Field(..., description="Parameter value")


class SetTempoAction(BaseModel):
    """Set global tempo"""
    action: Literal["set_tempo"] = "set_tempo"
    tempo: float = Field(..., ge=20.0, le=300.0, description="Tempo in BPM")


class AddEffectAction(BaseModel):
    """Add effect to track"""
    action: Literal["add_effect"] = "add_effect"
    track_id: str
    effect_name: str
    parameters: Optional[Dict[str, float]] = Field(None, description="Effect parameters")
    slot_index: Optional[int] = Field(None, ge=0, le=7, description="Insert slot (0-7)")


class SetEffectParameterAction(BaseModel):
    """Modify effect parameter"""
    action: Literal["set_effect_parameter"] = "set_effect_parameter"
    effect_id: str
    parameter: str
    value: float


class PlaySequenceAction(BaseModel):
    """Start playback"""
    action: Literal["play_sequence"] = "play_sequence"
    sequence_id: Optional[str] = Field(None, description="Sequence to play (current if not specified)")


class StopPlaybackAction(BaseModel):
    """Stop playback"""
    action: Literal["stop_playback"] = "stop_playback"


# ============================================================================
# ACTION EXECUTION
# ============================================================================

class DAWAction(BaseModel):
    """
    Union type for all possible actions
    LLM returns one of these via function calling
    """
    action: Literal[
        "create_midi_clip",
        "modify_clip",
        "delete_clip",
        "create_track",
        "set_track_parameter",
        "set_tempo",
        "add_effect",
        "set_effect_parameter",
        "play_sequence",
        "stop_playback"
    ]
    parameters: Dict[str, Any] = Field(..., description="Action-specific parameters")


class ActionResult(BaseModel):
    """Result of executing an action"""
    success: bool
    action: str
    message: str
    data: Optional[Dict[str, Any]] = Field(None, description="Result data (e.g., created clip ID)")
    error: Optional[str] = None


class BatchActionRequest(BaseModel):
    """Execute multiple actions atomically"""
    actions: List[DAWAction]
    atomic: bool = Field(default=False, description="If true, rollback all on any failure")


class BatchActionResponse(BaseModel):
    """Results of batch action execution"""
    results: List[ActionResult]
    all_succeeded: bool
    failed_count: int

