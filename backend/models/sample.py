"""
Sample recording and analysis models
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class Sample(BaseModel):
    """Audio sample metadata"""
    id: str = Field(..., description="Unique sample ID")
    name: str = Field(..., description="Sample name")
    filename: str = Field(..., description="File path")
    duration: float = Field(..., ge=0.0, description="Duration in seconds")
    sample_rate: int = Field(default=48000, description="Sample rate in Hz")
    channels: int = Field(default=2, description="Number of audio channels")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Creation timestamp")
    file_size: int = Field(default=0, description="File size in bytes")


class SpectralFeatures(BaseModel):
    """Detailed spectral analysis of a sample"""
    sample_id: str = Field(..., description="Reference to sample")
    
    # Frequency domain features
    spectral_centroid: float = Field(..., description="Spectral centroid in Hz")
    spectral_rolloff: float = Field(..., description="Spectral rolloff frequency in Hz")
    spectral_bandwidth: float = Field(..., description="Spectral bandwidth in Hz")
    spectral_flatness: float = Field(..., ge=0.0, le=1.0, description="Spectral flatness (0-1)")
    
    # Harmonic features
    fundamental_frequency: float = Field(..., description="Fundamental frequency in Hz")
    harmonics: List[float] = Field(default_factory=list, description="Harmonic frequencies")
    harmonic_amplitudes: List[float] = Field(default_factory=list, description="Harmonic amplitudes")
    
    # Temporal features
    attack_time: float = Field(..., description="Attack time in seconds")
    decay_time: float = Field(..., description="Decay time in seconds")
    sustain_level: float = Field(..., description="Sustain level (0-1)")
    release_time: float = Field(..., description="Release time in seconds")
    
    # Spectral envelope
    frequency_bins: List[float] = Field(default_factory=list, description="Frequency bin centers")
    magnitude_spectrum: List[float] = Field(default_factory=list, description="Magnitude spectrum")
    
    # Perceptual features
    brightness: float = Field(..., description="Perceptual brightness")
    roughness: float = Field(..., description="Perceptual roughness")
    warmth: float = Field(..., description="Perceptual warmth")


class SynthesisParameters(BaseModel):
    """LLM-generated synthesis parameters to replicate a sample"""
    sample_id: str = Field(..., description="Reference to original sample")
    
    # Sonic Pi synth selection
    synth_type: str = Field(..., description="Recommended Sonic Pi synth (e.g., 'saw', 'prophet', 'tb303')")
    
    # Core parameters
    note: str = Field(..., description="MIDI note or frequency")
    amp: float = Field(..., ge=0.0, le=1.0, description="Amplitude (0-1)")
    pan: float = Field(..., ge=-1.0, le=1.0, description="Stereo pan (-1 to 1)")
    
    # Envelope
    attack: float = Field(..., ge=0.0, description="Attack time in seconds")
    decay: float = Field(..., ge=0.0, description="Decay time in seconds")
    sustain: float = Field(..., ge=0.0, le=1.0, description="Sustain level (0-1)")
    release: float = Field(..., ge=0.0, description="Release time in seconds")
    
    # Filter
    cutoff: float = Field(..., ge=0.0, le=130.0, description="Filter cutoff frequency")
    res: float = Field(..., ge=0.0, le=1.0, description="Filter resonance (0-1)")
    
    # Modulation
    detune: float = Field(default=0.0, description="Detune amount")
    pulse_width: float = Field(default=0.5, ge=0.0, le=1.0, description="Pulse width for pulse waves")
    
    # Effects
    reverb: float = Field(default=0.0, ge=0.0, le=1.0, description="Reverb amount")
    echo: float = Field(default=0.0, ge=0.0, le=1.0, description="Echo amount")
    
    # LLM reasoning
    reasoning: str = Field(default="", description="LLM explanation of parameter choices")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in synthesis match")


class AudioDevice(BaseModel):
    """Audio input device information"""
    index: int = Field(..., description="Device index")
    name: str = Field(..., description="Device name")
    channels: int = Field(..., description="Number of input channels")
    sample_rate: int = Field(..., description="Default sample rate")


class RecordingRequest(BaseModel):
    """Request to start/stop recording"""
    action: str = Field(..., description="'start' or 'stop'")
    name: Optional[str] = Field(None, description="Sample name (for start action)")
    device_index: Optional[int] = Field(None, description="Audio input device index (for start action)")


class RenameRequest(BaseModel):
    """Request to rename a sample"""
    sample_id: str = Field(..., description="Sample ID to rename")
    new_name: str = Field(..., min_length=1, max_length=100, description="New sample name")


class AnalyzeRequest(BaseModel):
    """Request to analyze a sample"""
    sample_id: str = Field(..., description="Sample ID to analyze")


class SynthesizeRequest(BaseModel):
    """Request to synthesize parameters for a sample"""
    sample_id: str = Field(..., description="Sample ID to synthesize")

