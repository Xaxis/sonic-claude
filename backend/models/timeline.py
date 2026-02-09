"""
Timeline and Sequencer Models
Pydantic models for DAW-style timeline, tracks, clips, and MIDI events
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class ClipType(str, Enum):
    """Type of clip on timeline"""
    MIDI = "midi"
    AUDIO = "audio"
    PATTERN = "pattern"


class MIDIEvent(BaseModel):
    """Single MIDI note event"""
    note: int = Field(..., ge=0, le=127, description="MIDI note number (0-127)")
    note_name: str = Field(..., description="Note name (e.g., 'C4', 'F#3')")
    start_time: float = Field(..., ge=0, description="Start time in beats")
    duration: float = Field(..., gt=0, description="Duration in beats")
    velocity: int = Field(default=100, ge=0, le=127, description="MIDI velocity (0-127)")
    channel: int = Field(default=0, ge=0, le=15, description="MIDI channel (0-15)")


class Clip(BaseModel):
    """Timeline clip containing MIDI events or audio"""
    id: str = Field(..., description="Unique clip ID")
    name: str = Field(..., description="Clip name")
    type: ClipType = Field(..., description="Clip type")
    track_id: str = Field(..., description="Parent track ID")
    start_time: float = Field(..., ge=0, description="Start time in beats")
    duration: float = Field(..., gt=0, description="Duration in beats")
    color: str = Field(default="#3b82f6", description="Clip color (hex)")
    
    # MIDI-specific
    midi_events: List[MIDIEvent] = Field(default_factory=list, description="MIDI events in clip")
    
    # Audio-specific
    audio_file_path: Optional[str] = Field(None, description="Path to audio file")
    audio_offset: float = Field(default=0.0, description="Audio start offset in seconds")
    
    # Playback
    is_muted: bool = Field(default=False, description="Whether clip is muted")
    is_looped: bool = Field(default=False, description="Whether clip loops")
    loop_count: int = Field(default=1, ge=1, description="Number of loop iterations")


class Track(BaseModel):
    """Timeline track containing clips"""
    id: str = Field(..., description="Unique track ID")
    name: str = Field(..., description="Track name")
    color: str = Field(default="#3b82f6", description="Track color (hex)")
    height: int = Field(default=100, ge=50, le=500, description="Track height in pixels")
    
    # Clips
    clips: List[Clip] = Field(default_factory=list, description="Clips on this track")
    
    # Routing
    instrument: str = Field(default="piano", description="Sonic Pi synth/instrument")
    midi_channel: int = Field(default=0, ge=0, le=15, description="MIDI channel")
    
    # Mixing
    volume: float = Field(default=1.0, ge=0.0, le=2.0, description="Track volume (0.0-2.0)")
    pan: float = Field(default=0.0, ge=-1.0, le=1.0, description="Pan (-1.0 left, 1.0 right)")
    is_muted: bool = Field(default=False, description="Whether track is muted")
    is_solo: bool = Field(default=False, description="Whether track is soloed")
    is_armed: bool = Field(default=False, description="Whether track is armed for recording")


class TimelineSequence(BaseModel):
    """Complete timeline sequence"""
    id: str = Field(..., description="Unique sequence ID")
    name: str = Field(..., description="Sequence name")
    created_at: float = Field(..., description="Creation timestamp")
    updated_at: float = Field(..., description="Last update timestamp")
    
    # Tracks
    tracks: List[Track] = Field(default_factory=list, description="Tracks in sequence")
    
    # Playback settings
    tempo: float = Field(default=120.0, ge=20.0, le=300.0, description="Tempo in BPM")
    time_signature_numerator: int = Field(default=4, ge=1, le=16, description="Time signature numerator")
    time_signature_denominator: int = Field(default=4, description="Time signature denominator")
    key: str = Field(default="C", description="Musical key")
    scale: str = Field(default="major", description="Musical scale")
    
    # Timeline view
    zoom_level: float = Field(default=1.0, ge=0.1, le=10.0, description="Zoom level")
    scroll_position: float = Field(default=0.0, ge=0.0, description="Horizontal scroll position")
    
    # Playback state
    is_playing: bool = Field(default=False, description="Whether sequence is playing")
    is_recording: bool = Field(default=False, description="Whether recording is active")
    playhead_position: float = Field(default=0.0, ge=0.0, description="Playhead position in beats")
    loop_enabled: bool = Field(default=False, description="Whether loop is enabled")
    loop_start: float = Field(default=0.0, ge=0.0, description="Loop start in beats")
    loop_end: float = Field(default=16.0, gt=0.0, description="Loop end in beats")


class TimelineUpdate(BaseModel):
    """Real-time timeline update via WebSocket"""
    type: str = Field(..., description="Update type: 'playhead', 'track_added', 'clip_modified', etc.")
    timestamp: float = Field(..., description="Unix timestamp")
    sequence_id: str = Field(..., description="Sequence ID")
    data: Dict[str, Any] = Field(default_factory=dict, description="Update data")


class CreateSequenceRequest(BaseModel):
    """Request to create new sequence"""
    name: str = Field(..., description="Sequence name")
    tempo: float = Field(default=120.0, description="Initial tempo")
    time_signature: str = Field(default="4/4", description="Time signature")


class AddTrackRequest(BaseModel):
    """Request to add track to sequence"""
    sequence_id: str = Field(..., description="Sequence ID")
    name: str = Field(..., description="Track name")
    instrument: str = Field(default="piano", description="Sonic Pi instrument")


class AddClipRequest(BaseModel):
    """Request to add clip to track"""
    sequence_id: str = Field(..., description="Sequence ID")
    track_id: str = Field(..., description="Track ID")
    name: str = Field(..., description="Clip name")
    start_time: float = Field(..., description="Start time in beats")
    duration: float = Field(..., description="Duration in beats")
    midi_events: List[MIDIEvent] = Field(default_factory=list, description="MIDI events")


class UpdateClipRequest(BaseModel):
    """Request to update clip"""
    sequence_id: str = Field(..., description="Sequence ID")
    clip_id: str = Field(..., description="Clip ID")
    start_time: Optional[float] = Field(None, description="New start time")
    duration: Optional[float] = Field(None, description="New duration")
    midi_events: Optional[List[MIDIEvent]] = Field(None, description="Updated MIDI events")
    is_muted: Optional[bool] = Field(None, description="Mute state")

