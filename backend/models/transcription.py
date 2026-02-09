"""
Live Transcription Models
Pydantic models for real-time audio-to-Sonic-Pi transcription
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class StemType(str, Enum):
    """Audio stem types for source separation"""
    DRUMS = "drums"
    BASS = "bass"
    VOCALS = "vocals"
    OTHER = "other"


class Note(BaseModel):
    """Detected musical note"""
    pitch: float = Field(..., description="MIDI note number (0-127)")
    note_name: str = Field(..., description="Note name (e.g., 'C4', 'F#3')")
    onset_time: float = Field(..., description="Time of note onset in seconds")
    duration: float = Field(..., description="Note duration in seconds")
    velocity: float = Field(..., description="Note velocity (0.0-1.0)")
    confidence: float = Field(..., description="Detection confidence (0.0-1.0)")


class Beat(BaseModel):
    """Detected beat/onset"""
    time: float = Field(..., description="Beat time in seconds")
    strength: float = Field(..., description="Beat strength (0.0-1.0)")
    is_downbeat: bool = Field(default=False, description="Whether this is a downbeat")


class StemAnalysis(BaseModel):
    """Analysis results for a single audio stem"""
    stem_type: StemType = Field(..., description="Type of stem")
    notes: List[Note] = Field(default_factory=list, description="Detected notes")
    beats: List[Beat] = Field(default_factory=list, description="Detected beats")
    tempo: float = Field(..., description="Detected tempo in BPM")
    key: str = Field(..., description="Detected musical key")
    time_signature: str = Field(default="4/4", description="Time signature")
    dominant_frequencies: List[float] = Field(default_factory=list, description="Top 5 frequencies")
    energy: float = Field(..., description="Average energy level (0.0-1.0)")


class SonicPiCode(BaseModel):
    """Generated audio code for a stem (legacy - will be replaced with audio engine format)"""
    stem_type: StemType = Field(..., description="Type of stem")
    code: str = Field(..., description="Generated audio code")
    live_loop_name: str = Field(..., description="Name of the loop")
    synth_name: str = Field(..., description="Synth used")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Synth parameters")


class TranscriptionStatus(str, Enum):
    """Status of transcription process"""
    IDLE = "idle"
    LISTENING = "listening"
    ANALYZING = "analyzing"
    SEPARATING = "separating"
    TRANSCRIBING = "transcribing"
    COMPLETE = "complete"
    ERROR = "error"


class LiveTranscriptionState(BaseModel):
    """Current state of live transcription"""
    status: TranscriptionStatus = Field(..., description="Current status")
    device_index: Optional[int] = Field(None, description="Audio input device index")
    device_name: Optional[str] = Field(None, description="Audio input device name")
    buffer_duration: float = Field(default=8.0, description="Audio buffer duration in seconds")
    stems_enabled: Dict[StemType, bool] = Field(
        default_factory=lambda: {
            StemType.DRUMS: True,
            StemType.BASS: True,
            StemType.VOCALS: True,
            StemType.OTHER: True,
        },
        description="Which stems to analyze"
    )
    auto_send_to_sonic_pi: bool = Field(default=False, description="Auto-send code to Sonic Pi")
    result: Optional["LiveTranscriptionResult"] = Field(None, description="Transcription result if complete")


class LiveTranscriptionResult(BaseModel):
    """Complete transcription result"""
    status: TranscriptionStatus = Field(..., description="Transcription status")
    stems: List[StemAnalysis] = Field(default_factory=list, description="Analysis for each stem")
    sonic_pi_code: List[SonicPiCode] = Field(default_factory=list, description="Generated code for each stem")
    combined_code: str = Field(default="", description="Combined Sonic Pi code for all stems")
    processing_time: float = Field(..., description="Total processing time in seconds")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class TranscriptionRequest(BaseModel):
    """Request to start/stop transcription"""
    action: str = Field(..., description="Action: 'start' or 'stop'")
    device_index: Optional[int] = Field(None, description="Audio input device index")
    buffer_duration: float = Field(default=8.0, description="Audio buffer duration in seconds")
    stems_enabled: Optional[Dict[str, bool]] = Field(None, description="Which stems to analyze")
    auto_send: bool = Field(default=False, description="Auto-send code to Sonic Pi")


class TranscriptionSettings(BaseModel):
    """Settings for transcription engine"""
    buffer_duration: float = Field(default=8.0, ge=2.0, le=30.0, description="Buffer duration (2-30s)")
    onset_threshold: float = Field(default=0.5, ge=0.1, le=1.0, description="Onset detection threshold")
    pitch_confidence_threshold: float = Field(default=0.7, ge=0.5, le=1.0, description="Pitch detection confidence")
    min_note_duration: float = Field(default=0.05, ge=0.01, le=1.0, description="Minimum note duration")
    quantize_enabled: bool = Field(default=True, description="Quantize notes to grid")
    quantize_resolution: float = Field(default=0.125, description="Quantize resolution (1/8 note)")


class StreamUpdate(BaseModel):
    """Real-time update streamed via WebSocket"""
    type: str = Field(..., description="Update type: 'status', 'progress', 'result', 'error'")
    timestamp: float = Field(..., description="Unix timestamp")
    data: Dict[str, Any] = Field(default_factory=dict, description="Update data")


# Resolve forward references
LiveTranscriptionState.model_rebuild()

