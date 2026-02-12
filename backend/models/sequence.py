"""
Sequencer Models - Pydantic models for sequences, clips, and MIDI events
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
    
    # MIDI-specific
    midi_events: Optional[List[MIDINote]] = None
    
    # Audio-specific
    audio_file_path: Optional[str] = None
    audio_offset: Optional[float] = None


# ============================================================================
# TRACKS
# ============================================================================

class SequencerTrack(BaseModel):
    """Sequencer track"""
    id: str
    name: str
    sequence_id: str  # Parent sequence ID
    type: Literal["midi", "audio", "sample"] = "sample"  # Track type
    color: str = "#3b82f6"
    is_muted: bool = False
    is_solo: bool = False
    is_armed: bool = False

    # MIDI-specific
    instrument: Optional[str] = None  # Synth name
    midi_channel: int = Field(default=0, ge=0, le=15)

    # Sample-specific (for sample-based tracks)
    sample_id: Optional[str] = None  # Reference to sample library
    sample_name: Optional[str] = None  # Cached sample name
    sample_file_path: Optional[str] = None  # Cached file path


# ============================================================================
# SEQUENCES
# ============================================================================

class Sequence(BaseModel):
    """Complete sequence with tracks and clips"""
    id: str
    name: str
    tempo: float = Field(default=120.0, gt=0, le=300)
    time_signature: str = Field(default="4/4", pattern=r"^\d+/\d+$")
    tracks: List[SequencerTrack] = Field(default_factory=list)  # Tracks belong to sequence
    clips: List[Clip] = Field(default_factory=list)
    is_playing: bool = False
    current_position: float = Field(default=0.0, ge=0, description="Playhead position in beats")
    loop_enabled: bool = False
    loop_start: float = Field(default=0.0, ge=0)
    loop_end: float = Field(default=16.0, gt=0)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ============================================================================
# REQUEST MODELS
# ============================================================================

class CreateSequenceRequest(BaseModel):
    """Request to create a new sequence"""
    name: str
    tempo: Optional[float] = Field(default=120.0, gt=0, le=300)
    time_signature: Optional[str] = Field(default="4/4", pattern=r"^\d+/\d+$")


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


class SetTempoRequest(BaseModel):
    """Request to set tempo"""
    tempo: float = Field(..., gt=0, le=300)


class SeekRequest(BaseModel):
    """Request to seek to position"""
    position: float = Field(..., ge=0, description="Position in beats")

