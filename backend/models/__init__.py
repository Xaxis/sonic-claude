"""
Pydantic models for API requests and responses
"""
from .audio import AudioAnalysis, FrequencySpectrum
from .musical import MusicalState, Decision
from .ai import AIStatus, ChatRequest, ChatResponse
from .sample import (
    Sample, SpectralFeatures, SynthesisParameters,
    RecordingRequest, RenameRequest, AnalyzeRequest, SynthesizeRequest, AudioDevice
)
from .transcription import (
    StemType, Note, Beat, StemAnalysis, SonicPiCode,
    TranscriptionStatus, LiveTranscriptionState, LiveTranscriptionResult,
    TranscriptionRequest, TranscriptionSettings, StreamUpdate
)
from .timeline import (
    ClipType, MIDIEvent, Clip, Track, TimelineSequence, TimelineUpdate,
    CreateSequenceRequest, AddTrackRequest, AddClipRequest, UpdateClipRequest
)

__all__ = [
    "AudioAnalysis",
    "FrequencySpectrum",
    "MusicalState",
    "Decision",
    "AIStatus",
    "ChatRequest",
    "ChatResponse",
    "Sample",
    "SpectralFeatures",
    "SynthesisParameters",
    "RecordingRequest",
    "RenameRequest",
    "AnalyzeRequest",
    "SynthesizeRequest",
    "AudioDevice",
    "StemType",
    "Note",
    "Beat",
    "StemAnalysis",
    "SonicPiCode",
    "TranscriptionStatus",
    "LiveTranscriptionState",
    "LiveTranscriptionResult",
    "TranscriptionRequest",
    "TranscriptionSettings",
    "StreamUpdate",
    "ClipType",
    "MIDIEvent",
    "Clip",
    "Track",
    "TimelineSequence",
    "TimelineUpdate",
    "CreateSequenceRequest",
    "AddTrackRequest",
    "AddClipRequest",
    "UpdateClipRequest",
]

