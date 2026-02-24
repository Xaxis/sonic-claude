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
# EXTENDED TRACK OPERATIONS
# ============================================================================

class DeleteTrackAction(BaseModel):
    """Delete a track and all its clips"""
    action: Literal["delete_track"] = "delete_track"
    track_id: str


class RenameTrackAction(BaseModel):
    """Rename a track"""
    action: Literal["rename_track"] = "rename_track"
    track_id: str
    name: str


class ChangeTrackInstrumentAction(BaseModel):
    """Change the instrument/synth of a MIDI track"""
    action: Literal["change_track_instrument"] = "change_track_instrument"
    track_id: str
    instrument: str = Field(..., description="New instrument/synth name")


class ReorderTracksAction(BaseModel):
    """Reorder tracks in the composition"""
    action: Literal["reorder_tracks"] = "reorder_tracks"
    track_order: List[str] = Field(..., description="List of track IDs in desired order")


# ============================================================================
# EXTENDED CLIP OPERATIONS
# ============================================================================

class DuplicateClipAction(BaseModel):
    """Duplicate a clip"""
    action: Literal["duplicate_clip"] = "duplicate_clip"
    clip_id: str
    start_time: Optional[float] = Field(None, description="Start time for duplicate (auto-place if not specified)")


class MoveClipAction(BaseModel):
    """Move a clip to a different track or time"""
    action: Literal["move_clip"] = "move_clip"
    clip_id: str
    track_id: Optional[str] = Field(None, description="New track ID (keep same track if not specified)")
    start_time: Optional[float] = Field(None, description="New start time (keep same if not specified)")


class SplitClipAction(BaseModel):
    """Split a clip at a specific time"""
    action: Literal["split_clip"] = "split_clip"
    clip_id: str
    split_time: float = Field(..., description="Time to split at (in beats, relative to clip start)")


class SetClipGainAction(BaseModel):
    """Set clip gain/volume"""
    action: Literal["set_clip_gain"] = "set_clip_gain"
    clip_id: str
    gain: float = Field(..., ge=0.0, le=2.0, description="Clip gain (0.0-2.0, 1.0 = unity)")


# ============================================================================
# EXTENDED EFFECT OPERATIONS
# ============================================================================

class RemoveEffectAction(BaseModel):
    """Remove an effect from a track"""
    action: Literal["remove_effect"] = "remove_effect"
    effect_id: str


class BypassEffectAction(BaseModel):
    """Bypass/unbypass an effect"""
    action: Literal["bypass_effect"] = "bypass_effect"
    effect_id: str
    bypassed: bool


class ReorderEffectsAction(BaseModel):
    """Reorder effects in a track's effect chain"""
    action: Literal["reorder_effects"] = "reorder_effects"
    track_id: str
    effect_order: List[str] = Field(..., description="List of effect IDs in desired order")


# ============================================================================
# COMPOSITION OPERATIONS
# ============================================================================

class SetTimeSignatureAction(BaseModel):
    """Set composition time signature"""
    action: Literal["set_time_signature"] = "set_time_signature"
    time_signature: str = Field(..., pattern=r"^\d+/\d+$", description="Time signature (e.g., '4/4', '3/4', '6/8')")


class SetLoopPointsAction(BaseModel):
    """Set loop start and end points"""
    action: Literal["set_loop_points"] = "set_loop_points"
    loop_start: float = Field(..., ge=0.0, description="Loop start in beats")
    loop_end: float = Field(..., gt=0.0, description="Loop end in beats")
    loop_enabled: Optional[bool] = Field(None, description="Enable/disable looping")


class SeekToPositionAction(BaseModel):
    """Seek playhead to a specific position"""
    action: Literal["seek_to_position"] = "seek_to_position"
    position: float = Field(..., ge=0.0, description="Position in beats")


class RenameCompositionAction(BaseModel):
    """Rename the composition"""
    action: Literal["rename_composition"] = "rename_composition"
    name: str


# ============================================================================
# ACTION EXECUTION
# ============================================================================

class DAWAction(BaseModel):
    """
    Union type for all possible actions
    LLM returns one of these via function calling
    """
    action: Literal[
        # Clip operations
        "create_midi_clip",
        "modify_clip",
        "delete_clip",
        "duplicate_clip",
        "move_clip",
        "split_clip",
        "set_clip_gain",
        # Track operations
        "create_track",
        "delete_track",
        "rename_track",
        "change_track_instrument",
        "reorder_tracks",
        "set_track_parameter",
        # Effect operations
        "add_effect",
        "remove_effect",
        "bypass_effect",
        "reorder_effects",
        "set_effect_parameter",
        # Composition operations
        "set_tempo",
        "set_time_signature",
        "set_loop_points",
        "seek_to_position",
        "rename_composition",
        # Playback operations
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

