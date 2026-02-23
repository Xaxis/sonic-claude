"""
Track and Clip Models - Pydantic models for tracks, clips, and MIDI events

NOTE: This file will be renamed to track.py in a future refactor.
For now, keeping the name for backwards compatibility during migration.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# MIDI EVENTS
# ============================================================================

class MIDINote(BaseModel):
    """MIDI note event"""
    note: int = Field(..., ge=0, le=127, description="MIDI note number")
    note_name: str = Field(..., description="Note name (e.g., 'C4', 'F#3')")
    start_time: float = Field(..., ge=0, description="Start time in beats")
    duration: float = Field(..., gt=0, description="Duration in beats")
    velocity: int = Field(default=100, ge=0, le=127, description="MIDI velocity")
    channel: int = Field(default=0, ge=0, le=15, description="MIDI channel")


# ============================================================================
# CLIPS
# ============================================================================

class ClipBase(BaseModel):
    """Base clip model"""
    id: str
    name: str
    track_id: str
    start_time: float = Field(..., ge=0, description="Start time in beats")
    duration: float = Field(..., gt=0, description="Duration in beats")
    is_muted: bool = False
    is_looped: bool = False


class MIDIClip(ClipBase):
    """MIDI clip with note events"""
    type: Literal["midi"] = "midi"
    midi_events: List[MIDINote] = Field(default_factory=list)


class AudioClip(ClipBase):
    """Audio clip with file reference"""
    type: Literal["audio"] = "audio"
    audio_file_path: str
    audio_offset: float = Field(default=0.0, ge=0, description="Offset in seconds")


class Clip(BaseModel):
    """Union clip model"""
    id: str
    name: str
    type: Literal["midi", "audio"]
    track_id: str
    start_time: float = Field(..., ge=0)
    duration: float = Field(..., gt=0)
    is_muted: bool = False
    is_looped: bool = False
    gain: float = Field(default=1.0, ge=0.0, le=2.0, description="Clip gain/volume (0.0-2.0, 1.0 = unity)")

    # MIDI-specific
    midi_events: Optional[List[MIDINote]] = None

    # Audio-specific
    audio_file_path: Optional[str] = None
    audio_offset: Optional[float] = None


# ============================================================================
# TRACKS
# ============================================================================

class Track(BaseModel):
    """Track in a composition"""
    id: str
    name: str
    composition_id: str  # Parent composition ID
    type: Literal["midi", "audio", "sample"] = "sample"  # Track type
    color: str = "#3b82f6"
    is_muted: bool = False
    is_solo: bool = False
    is_armed: bool = False

    # Mixing
    volume: float = Field(default=1.0, ge=0.0, le=2.0, description="Track volume (0.0-2.0, 1.0 = unity)")
    pan: float = Field(default=0.0, ge=-1.0, le=1.0, description="Track pan (-1.0 = left, 0.0 = center, 1.0 = right)")

    # MIDI-specific
    instrument: Optional[str] = None  # Synth name
    midi_channel: int = Field(default=0, ge=0, le=15)

    # Sample-specific (for sample-based tracks)
    sample_id: Optional[str] = None  # Reference to sample library
    sample_name: Optional[str] = None  # Cached sample name
    sample_file_path: Optional[str] = None  # Cached file path


# Backwards compatibility alias - DEPRECATED, use Track instead
SequencerTrack = Track


# ============================================================================
# REQUEST MODELS
# ============================================================================
# NOTE: Sequence and CreateSequenceRequest have been DELETED.
# We use Composition (from composition.py) instead.


class AddClipRequest(BaseModel):
    """Request to add a clip to a sequence"""
    clip_type: Literal["midi", "audio"]
    track_id: str
    start_time: float = Field(..., ge=0)
    duration: float = Field(..., gt=0)
    midi_events: Optional[List[MIDINote]] = None
    audio_file_path: Optional[str] = None
    name: Optional[str] = None


class UpdateClipRequest(BaseModel):
    """Request to update a clip"""
    start_time: Optional[float] = Field(None, ge=0)
    duration: Optional[float] = Field(None, gt=0)
    midi_events: Optional[List[MIDINote]] = None
    is_muted: Optional[bool] = None
    is_looped: Optional[bool] = None
    gain: Optional[float] = Field(None, ge=0.0, le=2.0)
    audio_offset: Optional[float] = Field(None, ge=0.0)


class SetTempoRequest(BaseModel):
    """Request to set tempo"""
    tempo: float = Field(..., gt=0, le=300)


class SeekRequest(BaseModel):
    """Request to seek to position"""
    position: float = Field(..., ge=0, description="Position in beats")
    trigger_audio: bool = Field(default=True, description="Whether to trigger audio at the new position (for scrubbing)")

