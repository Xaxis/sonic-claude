"""
Pydantic models for API requests and responses
"""
from .audio import AudioAnalysis, FrequencySpectrum
from .musical import MusicalState, Decision
from .ai import AIStatus, ChatRequest, ChatResponse
from .osc import OSCMessage, TransportCommand
from .sample import (
    Sample, SpectralFeatures, SynthesisParameters,
    RecordingRequest, RenameRequest, AnalyzeRequest, SynthesizeRequest
)

__all__ = [
    "AudioAnalysis",
    "FrequencySpectrum",
    "MusicalState",
    "Decision",
    "AIStatus",
    "ChatRequest",
    "ChatResponse",
    "OSCMessage",
    "TransportCommand",
    "Sample",
    "SpectralFeatures",
    "SynthesisParameters",
    "RecordingRequest",
    "RenameRequest",
    "AnalyzeRequest",
    "SynthesizeRequest",
]

