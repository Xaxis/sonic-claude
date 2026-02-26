"""
Perception Models - Musical perception and analysis data structures

This module contains ALL perception-related models for the music perception pipeline.
Organized into 3 layers:

Layer 1: Raw Analysis (technical features)
- AudioFeatures: Real-time FFT/meter analysis
- MusicalContext: MIDI-derived musical features

Layer 2: Musical Perception (perceptual descriptions)
- TrackPerception: How a track "sounds" (timbre, rhythm, character)
- ClipPerception: How a clip "sounds" in context

Layer 3: Compositional Intelligence (mix-level understanding)
- CompositionPerception: How tracks work together (masking, conflicts, balance)
- MixPerception: Overall mix quality and coherence

Design principles:
- Human-readable descriptions for LLM consumption
- Hierarchical (can request different detail levels)
- Cacheable (expensive to compute, so cache results)
- Actionable (descriptions should inform mixing/composition decisions)
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# LAYER 1: RAW ANALYSIS (Technical Features)
# ============================================================================

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


# ============================================================================
# LAYER 2: MUSICAL PERCEPTION (Perceptual Descriptions)
# ============================================================================

class TimbreDescription(BaseModel):
    """Perceptual timbre description for LLM understanding"""
    # Quantitative (0-1 scales)
    brightness: float = Field(0.5, ge=0.0, le=1.0, description="Bright (1) vs dark (0)")
    warmth: float = Field(0.5, ge=0.0, le=1.0, description="Warm (1) vs cold (0)")
    roughness: float = Field(0.0, ge=0.0, le=1.0, description="Rough (1) vs smooth (0)")
    fullness: float = Field(0.5, ge=0.0, le=1.0, description="Full (1) vs thin (0)")

    # Qualitative (semantic tags)
    character: List[str] = Field(
        default_factory=list,
        description="Descriptive tags (e.g., 'warm pad', 'sharp kick', 'bright lead')"
    )

    # Natural language summary
    summary: str = Field(
        default="",
        description="Human-readable timbre description for LLM (e.g., 'bright, cutting lead with sharp attack')"
    )


class RhythmDescription(BaseModel):
    """Perceptual rhythm description for LLM understanding"""
    # Quantitative
    density: float = Field(0.0, ge=0.0, description="Notes per beat")
    syncopation: float = Field(0.0, ge=0.0, le=1.0, description="Syncopation level (0=on-beat, 1=highly syncopated)")
    groove: float = Field(0.0, ge=0.0, le=1.0, description="Groove/swing amount")

    # Qualitative
    pattern_type: Optional[str] = Field(None, description="Pattern type (e.g., 'straight', 'swung', 'triplet')")

    # Natural language summary
    summary: str = Field(
        default="",
        description="Human-readable rhythm description (e.g., 'steady four-on-the-floor kick pattern')"
    )


class TrackPerception(BaseModel):
    """
    How a track "sounds" - perceptual description for AI understanding

    This is Layer 2: translates technical features into musical descriptions
    """
    track_id: str
    track_name: str

    # Perceptual descriptions
    timbre: TimbreDescription
    rhythm: RhythmDescription

    # Role in mix
    role: Optional[str] = Field(
        None,
        description="Track role (e.g., 'lead melody', 'bass foundation', 'rhythmic pad', 'percussion')"
    )

    # Frequency range (for masking analysis)
    dominant_frequency_range: Optional[str] = Field(
        None,
        description="Dominant frequency range (e.g., 'sub-bass', 'low-mids', 'highs')"
    )

    # Overall summary for LLM
    summary: str = Field(
        default="",
        description="Complete perceptual summary (e.g., 'Bright, cutting lead synth with steady 8th note pattern in the high-mids')"
    )

    # Metadata
    analyzed_at: datetime = Field(default_factory=datetime.now)


class ClipPerception(BaseModel):
    """How a clip "sounds" in the context of the composition"""
    clip_id: str
    clip_name: str
    track_id: str

    # Perceptual description
    character: str = Field(
        default="",
        description="Clip character (e.g., 'energetic drum fill', 'mellow chord progression')"
    )

    # Harmonic content (for MIDI clips)
    harmonic_summary: Optional[str] = Field(
        None,
        description="Harmonic content (e.g., 'Cmaj7 arpeggio', 'chromatic bass line')"
    )

    # Analyzed at
    analyzed_at: datetime = Field(default_factory=datetime.now)


# ============================================================================
# LAYER 3: COMPOSITIONAL INTELLIGENCE (Mix-Level Understanding)
# ============================================================================

class FrequencyConflict(BaseModel):
    """Detected frequency masking between tracks"""
    track_a_id: str
    track_a_name: str
    track_b_id: str
    track_b_name: str
    frequency_range: str = Field(..., description="Conflicting range (e.g., 'low-mids 200-500Hz')")
    severity: float = Field(..., ge=0.0, le=1.0, description="Conflict severity (0=none, 1=severe)")
    suggestion: str = Field(..., description="How to fix (e.g., 'EQ cut 300Hz on bass, boost on guitar')")


class HarmonicConflict(BaseModel):
    """Detected harmonic clash between tracks"""
    track_a_id: str
    track_a_name: str
    track_b_id: str
    track_b_name: str
    conflict_type: str = Field(..., description="Type of conflict (e.g., 'dissonant interval', 'key mismatch')")
    severity: float = Field(..., ge=0.0, le=1.0, description="Conflict severity")
    suggestion: str = Field(..., description="How to fix")


class StereoFieldAnalysis(BaseModel):
    """Analysis of stereo field usage"""
    balance: float = Field(0.0, ge=-1.0, le=1.0, description="L/R balance (-1=left, 1=right, 0=centered)")
    width: float = Field(0.0, ge=0.0, le=1.0, description="Stereo width (0=mono, 1=wide)")
    crowding: float = Field(0.0, ge=0.0, le=1.0, description="How crowded the stereo field is")
    summary: str = Field(default="", description="Stereo field description for LLM")


class FrequencyBalance(BaseModel):
    """Energy distribution across frequency bands"""
    sub_bass: float = Field(0.0, ge=0.0, le=1.0, description="Energy in sub-bass (20-60Hz)")
    bass: float = Field(0.0, ge=0.0, le=1.0, description="Energy in bass (60-250Hz)")
    low_mids: float = Field(0.0, ge=0.0, le=1.0, description="Energy in low-mids (250-500Hz)")
    mids: float = Field(0.0, ge=0.0, le=1.0, description="Energy in mids (500-2kHz)")
    high_mids: float = Field(0.0, ge=0.0, le=1.0, description="Energy in high-mids (2k-6kHz)")
    highs: float = Field(0.0, ge=0.0, le=1.0, description="Energy in highs (6k-20kHz)")

    # Qualitative assessment
    balance_quality: str = Field(
        default="balanced",
        description="Balance quality (e.g., 'bass-heavy', 'bright', 'balanced', 'muddy')"
    )
    summary: str = Field(default="", description="Frequency balance description for LLM")

    # Actionable insights (for AI agent)
    crowded_ranges: List[str] = Field(
        default_factory=list,
        description="Frequency ranges that are overcrowded (e.g., 'mids (500-2kHz)')"
    )
    empty_ranges: List[str] = Field(
        default_factory=list,
        description="Frequency ranges that are empty/sparse (e.g., 'highs (6k-20kHz)')"
    )


class CompositionPerception(BaseModel):
    """
    How the composition "sounds" as a whole - mix-level perception

    This is Layer 3: compositional intelligence and mix understanding
    """
    composition_id: str
    composition_name: str

    # Track-level perceptions
    track_perceptions: List[TrackPerception] = Field(
        default_factory=list,
        description="Perceptual analysis of each track"
    )

    # Conflicts and issues
    frequency_conflicts: List[FrequencyConflict] = Field(
        default_factory=list,
        description="Detected frequency masking issues"
    )
    harmonic_conflicts: List[HarmonicConflict] = Field(
        default_factory=list,
        description="Detected harmonic clashes"
    )

    # Mix analysis
    stereo_field: StereoFieldAnalysis = Field(
        default_factory=StereoFieldAnalysis,
        description="Stereo field usage analysis"
    )
    frequency_balance: FrequencyBalance = Field(
        default_factory=FrequencyBalance,
        description="Frequency distribution analysis"
    )

    # Overall coherence
    timbre_coherence: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="How well timbres work together (0=clashing, 1=cohesive)"
    )
    rhythmic_coherence: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="How well rhythms work together (0=chaotic, 1=tight)"
    )

    # Mix quality assessment
    mix_quality: float = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Overall mix quality (0=poor, 1=excellent)"
    )

    # Natural language summary for LLM
    summary: str = Field(
        default="",
        description="Complete compositional summary for LLM (e.g., 'Balanced mix with clear separation. Bass and kick have slight low-end masking around 80Hz. Stereo field is well-utilized with pads wide and lead centered.')"
    )

    # Actionable suggestions
    suggestions: List[str] = Field(
        default_factory=list,
        description="Specific mixing/arrangement suggestions (e.g., 'Add sidechain compression on bass from kick', 'Pan hi-hats slightly right for balance')"
    )

    # Metadata
    analyzed_at: datetime = Field(default_factory=datetime.now)


# ============================================================================
# PERCEPTION CONTEXT (for AI Agent)
# ============================================================================

class PerceptionContext(BaseModel):
    """
    Complete perception context for AI agent

    This is what gets passed to the LLM to give it "ears"
    """
    # Current composition perception
    composition: Optional[CompositionPerception] = None

    # Real-time audio features (what's playing NOW)
    current_audio: Optional[AudioFeatures] = None

    # Musical context (what's in the timeline)
    current_musical: Optional[MusicalContext] = None

    # Depth control (how much detail to include)
    detail_level: Literal["minimal", "standard", "detailed"] = "standard"

    # Natural language summary (the key part for LLM)
    summary: str = Field(
        default="",
        description="Complete perceptual summary for LLM prompt"
    )

    # Timestamp
    generated_at: datetime = Field(default_factory=datetime.now)
