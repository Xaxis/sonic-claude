"""
WebSocket Data Models
Real-time streaming data structures
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class SpectrumData(BaseModel):
    """Frequency spectrum data"""
    type: str = "spectrum"
    frequencies: List[float] = Field(..., description="Frequency bins (Hz)")
    magnitudes: List[float] = Field(..., description="Magnitude values (dB)")
    sample_rate: int = Field(default=48000, description="Sample rate")
    fft_size: int = Field(default=2048, description="FFT size")


class MeterData(BaseModel):
    """Audio metering data"""
    type: str = "meters"
    track_id: str = Field(..., description="Track identifier")
    peak_left: float = Field(..., ge=-96.0, le=6.0, description="Peak level L (dB)")
    peak_right: float = Field(..., ge=-96.0, le=6.0, description="Peak level R (dB)")
    rms_left: float = Field(..., ge=-96.0, le=6.0, description="RMS level L (dB)")
    rms_right: float = Field(..., ge=-96.0, le=6.0, description="RMS level R (dB)")


class WaveformData(BaseModel):
    """Waveform display data"""
    type: str = "waveform"
    samples_left: List[float] = Field(..., description="Left channel samples")
    samples_right: List[float] = Field(..., description="Right channel samples")
    sample_rate: int = Field(default=48000, description="Sample rate")
    duration: float = Field(..., description="Duration in seconds")


class TransportData(BaseModel):
    """Transport/playback position data"""
    type: str = "transport"
    is_playing: bool = Field(..., description="Playback state")
    position_beats: float = Field(..., description="Current position in beats")
    position_seconds: float = Field(..., description="Current position in seconds")
    tempo: float = Field(..., description="Current tempo (BPM)")
    time_signature_num: int = Field(default=4, description="Time signature numerator")
    time_signature_den: int = Field(default=4, description="Time signature denominator")
    loop_enabled: bool = Field(default=False, description="Loop enabled")
    loop_start: Optional[float] = Field(None, description="Loop start (beats)")
    loop_end: Optional[float] = Field(None, description="Loop end (beats)")


class AnalyticsData(BaseModel):
    """Musical analytics data"""
    type: str = "analytics"
    energy: float = Field(..., ge=0.0, le=1.0, description="Energy level")
    brightness: float = Field(..., ge=0.0, le=1.0, description="Spectral brightness")
    rhythm: float = Field(..., ge=0.0, le=1.0, description="Rhythmic intensity")
    dominant_frequency: float = Field(..., description="Dominant frequency (Hz)")
    spectral_centroid: float = Field(..., description="Spectral centroid (Hz)")
    spectral_rolloff: float = Field(..., description="Spectral rolloff (Hz)")
    zero_crossing_rate: float = Field(..., description="Zero crossing rate")
    tempo_estimate: Optional[float] = Field(None, description="Estimated tempo (BPM)")
    key_estimate: Optional[str] = Field(None, description="Estimated key")

