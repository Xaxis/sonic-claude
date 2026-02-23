"""
DAW State Models - Efficient state representation for AI consumption

Design principles:
- Compact serialization (minimize token usage)
- Hierarchical structure (AI can request detail levels)
- Cacheable (detect changes, only send diffs)
- Human-readable (LLM can understand structure)
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# COMPACT STATE REPRESENTATIONS
# ============================================================================

class CompactMIDINote(BaseModel):
    """Minimal MIDI note representation for AI"""
    n: int = Field(..., description="MIDI note number (0-127)")
    s: float = Field(..., description="Start time in beats")
    d: float = Field(..., description="Duration in beats")
    v: int = Field(default=100, description="Velocity (0-127)")


class CompactClip(BaseModel):
    """Minimal clip representation"""
    id: str
    name: str
    track: str = Field(..., description="Track ID")
    type: Literal["midi", "audio"]
    start: float = Field(..., description="Start time in beats")
    dur: float = Field(..., description="Duration in beats")
    muted: bool = False

    # MIDI-specific (only if type=midi)
    notes: Optional[List[CompactMIDINote]] = None

    # Audio-specific (only if type=audio)
    file: Optional[str] = None
    audio_analysis: Optional[Dict[str, Any]] = Field(None, description="Audio analysis summary")


class CompactTrack(BaseModel):
    """Minimal track representation"""
    id: str
    name: str
    type: Literal["midi", "audio", "sample"]
    instrument: Optional[str] = None  # For MIDI tracks
    vol: float = Field(default=1.0, description="Volume (0.0-2.0)")
    pan: float = Field(default=0.0, description="Pan (-1.0 to 1.0)")
    muted: bool = False
    solo: bool = False


class CompactComposition(BaseModel):
    """Minimal composition representation"""
    id: str
    name: str
    tempo: float
    time_sig: str = Field(default="4/4")
    tracks: List[CompactTrack]
    clips: List[CompactClip]


# Backwards compatibility alias - DEPRECATED, use CompactComposition instead
CompactSequence = CompactComposition


class AudioFeatures(BaseModel):
    """Real-time audio analysis features (derived from FFT/meters)"""
    energy: float = Field(..., ge=0.0, le=1.0, description="RMS energy (0-1)")
    brightness: float = Field(..., ge=0.0, le=1.0, description="Spectral centroid normalized (0-1)")
    loudness_db: float = Field(..., description="Peak level in dB")
    is_playing: bool = Field(..., description="Is audio currently playing")


class MusicalContext(BaseModel):
    """High-level musical analysis (computed from MIDI data)"""
    key: Optional[str] = Field(None, description="Detected key (e.g., 'C major', 'A minor')")
    scale: Optional[str] = Field(None, description="Scale type")
    note_density: float = Field(default=0.0, ge=0.0, description="Notes per beat")
    pitch_range: tuple[int, int] = Field(default=(60, 72), description="Min/max MIDI notes")
    complexity: float = Field(default=0.0, ge=0.0, le=1.0, description="Rhythmic/harmonic complexity (0-1)")


class DAWStateSnapshot(BaseModel):
    """
    Complete DAW state snapshot - optimized for AI consumption
    
    Design:
    - Compact field names to reduce tokens
    - Optional detail levels (can request just summary)
    - Includes timestamp for change detection
    """
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # Playback state
    playing: bool = False
    position: float = Field(default=0.0, description="Playhead position in beats")
    tempo: float = Field(default=120.0)
    
    # Current sequence (if any)
    sequence: Optional[CompactSequence] = None
    
    # Audio analysis (real-time)
    audio: Optional[AudioFeatures] = None
    
    # Musical analysis (computed from MIDI)
    musical: Optional[MusicalContext] = None
    
    # State hash for change detection
    state_hash: Optional[str] = Field(None, description="Hash of state for diff detection")


class DAWStateDiff(BaseModel):
    """
    State difference - only changed fields
    Dramatically reduces token usage for incremental updates
    """
    timestamp: datetime = Field(default_factory=datetime.now)
    changed_fields: List[str] = Field(..., description="List of changed field paths")
    changes: Dict[str, Any] = Field(..., description="Only the changed values")


# ============================================================================
# DETAIL LEVEL CONTROL
# ============================================================================

class StateDetailLevel(BaseModel):
    """Control how much detail to include in state snapshot"""
    include_clips: bool = Field(default=True, description="Include clip data")
    include_notes: bool = Field(default=True, description="Include MIDI note data")
    include_audio_analysis: bool = Field(default=True, description="Include real-time audio features")
    include_musical_analysis: bool = Field(default=True, description="Include musical context")
    max_clips: Optional[int] = Field(None, description="Limit number of clips returned")
    max_notes_per_clip: Optional[int] = Field(None, description="Limit notes per clip")


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class GetStateRequest(BaseModel):
    """Request for DAW state with optional detail control"""
    detail: StateDetailLevel = Field(default_factory=StateDetailLevel)
    previous_hash: Optional[str] = Field(None, description="Previous state hash for diff detection")


class GetStateResponse(BaseModel):
    """Response with state or diff"""
    full_state: Optional[DAWStateSnapshot] = None
    diff: Optional[DAWStateDiff] = None
    is_diff: bool = Field(default=False, description="True if returning diff instead of full state")

