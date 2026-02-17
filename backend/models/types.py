"""
Type definitions for improved type safety across the backend

This module provides TypedDict definitions to replace Dict[str, Any] usage
and improve IDE support and type checking.
"""
from typing import TypedDict, Optional, List


class SynthInfo(TypedDict):
    """Information about an active synth"""
    id: int
    synthdef: str
    parameters: dict[str, float]
    group: int
    bus: Optional[int]


class ActiveMIDINote(TypedDict):
    """Information about an active MIDI note"""
    clip_id: str
    note: int
    start_time: float


class PlaybackState(TypedDict):
    """Current playback state"""
    is_playing: bool
    current_sequence: Optional[str]
    playhead_position: float
    tempo: float
    is_paused: bool
    metronome_enabled: bool


class TransportData(TypedDict):
    """Transport state data for WebSocket broadcast"""
    is_playing: bool
    is_paused: bool
    playhead_position: float
    tempo: float
    current_sequence_id: Optional[str]


class SpectrumData(TypedDict):
    """FFT spectrum data for visualization"""
    frequencies: List[float]
    magnitudes: List[float]
    timestamp: float


class WaveformData(TypedDict):
    """Time-domain waveform data"""
    samples: List[float]
    timestamp: float


class MeterData(TypedDict):
    """Audio level meter data"""
    peak_left: float
    peak_right: float
    rms_left: float
    rms_right: float
    timestamp: float


class AudioAnalysisData(TypedDict):
    """Complete audio analysis data"""
    spectrum: Optional[SpectrumData]
    waveform: Optional[WaveformData]
    meters: Optional[MeterData]

