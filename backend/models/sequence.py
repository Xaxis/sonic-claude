"""
Track and Clip Models - Pydantic models for tracks, clips, and MIDI events

NOTE: This file will be renamed to track.py in a future refactor.
For now, keeping the name for backwards compatibility during migration.
"""
from typing import List, Optional, Literal, Any
from pydantic import BaseModel, Field, model_validator
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
    sample_id: Optional[str] = None          # Source sample ID
    audio_end: Optional[float] = None        # Trim end point (seconds from file start, None = full length)
    pitch_semitones: float = 0.0             # Pitch shift in semitones (-24 to +24)
    playback_rate: float = 1.0               # Speed/rate multiplier (0.25 to 4.0)
    reverse: bool = False                    # Reverse playback
    fade_in: float = 0.0                     # Fade in duration (seconds)
    fade_out: float = 0.0                    # Fade out duration (seconds)
    loop_enabled: bool = False               # Enable loop region
    loop_start: float = 0.0                  # Loop region start (seconds from file start)
    loop_end: Optional[float] = None         # Loop region end (None = full length)

    # MIDI clip transforms — non-destructive, applied at playback scheduling time.
    # Raw midi_events are stored unmodified; these offsets are blended in at runtime.
    midi_transpose: int = Field(default=0, ge=-24, le=24)               # semitones added to every note
    midi_velocity_offset: int = Field(default=0, ge=-64, le=64)         # velocity delta (+/-)
    midi_gate: float = Field(default=1.0, ge=0.25, le=4.0)              # note duration multiplier
    midi_timing_offset: float = Field(default=0.0, ge=-1.0, le=1.0)     # beat offset (+/-)
    midi_quantize_strength: int = Field(default=0, ge=0, le=100)        # 0 = off, 100 = full snap to 1/4 beat


# ============================================================================
# TRACKS
# ============================================================================

class Track(BaseModel):
    """Track in a composition"""
    id: str
    name: str
    composition_id: str  # Parent composition ID
    type: Literal["midi", "audio"] = "audio"  # Track type
    color: str = "#3b82f6"

    @model_validator(mode='before')
    @classmethod
    def migrate_sample_type(cls, data: Any) -> Any:
        """Backward compatibility: convert 'sample' track type to 'audio'"""
        if isinstance(data, dict) and data.get('type') == 'sample':
            data = dict(data)
            data['type'] = 'audio'
        return data
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
    sample_id: Optional[str] = None
    audio_offset: Optional[float] = Field(None, ge=0.0)
    audio_end: Optional[float] = Field(None, ge=0.0)
    pitch_semitones: float = Field(default=0.0, ge=-24.0, le=24.0)
    playback_rate: float = Field(default=1.0, ge=0.25, le=4.0)
    reverse: bool = False
    fade_in: float = Field(default=0.0, ge=0.0, le=5.0)
    fade_out: float = Field(default=0.0, ge=0.0, le=5.0)
    loop_enabled: bool = False
    loop_start: float = Field(default=0.0, ge=0.0)
    loop_end: Optional[float] = Field(None, ge=0.0)
    # MIDI clip transforms
    midi_transpose: int = Field(default=0, ge=-24, le=24)
    midi_velocity_offset: int = Field(default=0, ge=-64, le=64)
    midi_gate: float = Field(default=1.0, ge=0.25, le=4.0)
    midi_timing_offset: float = Field(default=0.0, ge=-1.0, le=1.0)
    midi_quantize_strength: int = Field(default=0, ge=0, le=100)


class UpdateClipRequest(BaseModel):
    """Request to update a clip"""
    start_time: Optional[float] = Field(None, ge=0)
    duration: Optional[float] = Field(None, gt=0)
    name: Optional[str] = None
    midi_events: Optional[List[MIDINote]] = None
    is_muted: Optional[bool] = None
    is_looped: Optional[bool] = None
    gain: Optional[float] = Field(None, ge=0.0, le=2.0)
    # Audio trim
    audio_offset: Optional[float] = Field(None, ge=0.0)
    audio_end: Optional[float] = Field(None, ge=0.0)
    # Playback modifiers
    pitch_semitones: Optional[float] = Field(None, ge=-24.0, le=24.0)
    playback_rate: Optional[float] = Field(None, ge=0.25, le=4.0)
    reverse: Optional[bool] = None
    # Fades
    fade_in: Optional[float] = Field(None, ge=0.0, le=5.0)
    fade_out: Optional[float] = Field(None, ge=0.0, le=5.0)
    # Loop region
    loop_enabled: Optional[bool] = None
    loop_start: Optional[float] = Field(None, ge=0.0)
    loop_end: Optional[float] = Field(None, ge=0.0)
    # MIDI clip transforms
    midi_transpose: Optional[int] = Field(None, ge=-24, le=24)
    midi_velocity_offset: Optional[int] = Field(None, ge=-64, le=64)
    midi_gate: Optional[float] = Field(None, ge=0.25, le=4.0)
    midi_timing_offset: Optional[float] = Field(None, ge=-1.0, le=1.0)
    midi_quantize_strength: Optional[int] = Field(None, ge=0, le=100)

    @model_validator(mode='after')
    def validate_trim_order(self) -> 'UpdateClipRequest':
        """Ensure audio_end > audio_offset when both are provided in the same request."""
        if self.audio_offset is not None and self.audio_end is not None:
            if self.audio_end <= self.audio_offset:
                raise ValueError("audio_end must be greater than audio_offset")
        if self.loop_start is not None and self.loop_end is not None:
            if self.loop_end <= self.loop_start:
                raise ValueError("loop_end must be greater than loop_start")
        return self


class SetTempoRequest(BaseModel):
    """Request to set tempo"""
    tempo: float = Field(..., gt=0, le=300)


class SeekRequest(BaseModel):
    """Request to seek to position"""
    position: float = Field(..., ge=0, description="Position in beats")
    trigger_audio: bool = Field(default=True, description="Whether to trigger audio at the new position (for scrubbing)")

