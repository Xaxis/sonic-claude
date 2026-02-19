"""
Sample Analysis Models - Audio feature extraction and characterization

Represents the audio characteristics of samples so the AI can understand
what sounds are being used and how they work together.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SpectralFeatures(BaseModel):
    """Spectral characteristics of a sample"""
    centroid: float = Field(..., description="Spectral centroid (brightness) in Hz")
    rolloff: float = Field(..., description="Spectral rolloff frequency in Hz")
    flux: float = Field(..., description="Spectral flux (rate of change)")
    flatness: float = Field(0.0, ge=0.0, le=1.0, description="Spectral flatness (0=tonal, 1=noisy)")
    bandwidth: float = Field(..., description="Spectral bandwidth in Hz")
    
    # Frequency distribution
    sub_bass_energy: float = Field(0.0, ge=0.0, le=1.0, description="Energy in 20-60Hz")
    bass_energy: float = Field(0.0, ge=0.0, le=1.0, description="Energy in 60-250Hz")
    low_mid_energy: float = Field(0.0, ge=0.0, le=1.0, description="Energy in 250-500Hz")
    mid_energy: float = Field(0.0, ge=0.0, le=1.0, description="Energy in 500-2kHz")
    high_mid_energy: float = Field(0.0, ge=0.0, le=1.0, description="Energy in 2k-6kHz")
    high_energy: float = Field(0.0, ge=0.0, le=1.0, description="Energy in 6k-20kHz")


class TemporalFeatures(BaseModel):
    """Temporal characteristics of a sample"""
    duration: float = Field(..., description="Duration in seconds")
    attack_time: float = Field(..., description="Attack time in seconds")
    decay_time: float = Field(..., description="Decay time in seconds")
    sustain_level: float = Field(0.0, ge=0.0, le=1.0, description="Sustain level (0-1)")
    release_time: float = Field(..., description="Release time in seconds")
    
    # Transient characteristics
    is_percussive: bool = Field(..., description="Has sharp transient (drum-like)")
    is_sustained: bool = Field(..., description="Has sustained portion (pad-like)")
    transient_strength: float = Field(0.0, ge=0.0, le=1.0, description="Strength of initial transient")
    
    # Zero crossing rate (indicates noisiness)
    zcr_mean: float = Field(..., description="Mean zero crossing rate")
    zcr_std: float = Field(..., description="Std dev of zero crossing rate")


class PitchFeatures(BaseModel):
    """Pitch-related characteristics"""
    has_pitch: bool = Field(..., description="Whether sample has clear pitch")
    fundamental_freq: Optional[float] = Field(None, description="Fundamental frequency in Hz")
    midi_note: Optional[int] = Field(None, description="Closest MIDI note number")
    pitch_confidence: float = Field(0.0, ge=0.0, le=1.0, description="Confidence in pitch detection")
    harmonicity: float = Field(0.0, ge=0.0, le=1.0, description="Harmonic vs inharmonic content")


class TimbreDescriptors(BaseModel):
    """High-level timbre descriptors for AI understanding"""
    brightness: float = Field(0.0, ge=0.0, le=1.0, description="Bright (1) vs dark (0)")
    warmth: float = Field(0.0, ge=0.0, le=1.0, description="Warm (1) vs cold (0)")
    roughness: float = Field(0.0, ge=0.0, le=1.0, description="Rough (1) vs smooth (0)")
    fullness: float = Field(0.0, ge=0.0, le=1.0, description="Full (1) vs thin (0)")
    
    # Semantic tags (AI-friendly descriptions)
    tags: List[str] = Field(default_factory=list, description="Descriptive tags (e.g., 'warm pad', 'sharp kick')")


class SampleAnalysis(BaseModel):
    """Complete analysis of an audio sample"""
    # Identification
    file_path: str = Field(..., description="Path to sample file")
    file_hash: str = Field(..., description="Hash of file for cache invalidation")
    analyzed_at: datetime = Field(default_factory=datetime.now)
    
    # Audio properties
    sample_rate: int = Field(..., description="Sample rate in Hz")
    channels: int = Field(..., description="Number of channels")
    bit_depth: int = Field(..., description="Bit depth")
    
    # Feature sets
    spectral: SpectralFeatures
    temporal: TemporalFeatures
    pitch: PitchFeatures
    timbre: TimbreDescriptors
    
    # RMS energy
    rms_db: float = Field(..., description="RMS level in dB")
    peak_db: float = Field(..., description="Peak level in dB")
    
    # AI-friendly summary
    summary: str = Field(..., description="Human-readable summary for LLM")


class CompositionAnalysis(BaseModel):
    """Analysis of how samples work together in a composition"""
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # Frequency masking analysis
    frequency_conflicts: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Tracks that clash in frequency space"
    )
    
    # Stereo field analysis
    stereo_balance: float = Field(0.0, ge=-1.0, le=1.0, description="L/R balance (-1=left, 1=right)")
    stereo_width: float = Field(0.0, ge=0.0, le=1.0, description="Stereo width (0=mono, 1=wide)")
    
    # Mix balance
    frequency_balance: Dict[str, float] = Field(
        default_factory=dict,
        description="Energy distribution across frequency bands"
    )
    
    # Timbre coherence
    timbre_coherence: float = Field(0.0, ge=0.0, le=1.0, description="How well timbres work together")
    
    # AI-friendly summary
    summary: str = Field(..., description="Human-readable summary for LLM")


class SampleDatabase(BaseModel):
    """Database of analyzed samples"""
    samples: Dict[str, SampleAnalysis] = Field(
        default_factory=dict,
        description="Map of file_path -> analysis"
    )
    last_updated: datetime = Field(default_factory=datetime.now)

