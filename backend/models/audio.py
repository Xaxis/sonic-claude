"""
Audio analysis models
"""
from pydantic import BaseModel, Field
from typing import List


class AudioAnalysis(BaseModel):
    """Real-time audio analysis metrics"""
    energy: float = Field(..., ge=0.0, le=1.0, description="Audio energy level (0-1)")
    brightness: float = Field(..., ge=0.0, description="Spectral centroid in Hz")
    rhythm: float = Field(..., ge=0.0, le=1.0, description="Rhythmic intensity (0-1)")
    dominant_frequency: float = Field(default=0.0, ge=0.0, description="Dominant frequency in Hz")


class FrequencySpectrum(BaseModel):
    """Frequency spectrum data for visualization"""
    bins: List[float] = Field(..., description="Normalized frequency bins (0-1)")
    sample_rate: int = Field(default=44100, description="Audio sample rate")
    num_bins: int = Field(default=100, description="Number of frequency bins")

