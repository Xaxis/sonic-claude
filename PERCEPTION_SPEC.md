# Music Perception Pipeline - Technical Specification

## Overview

This document specifies the NEW perception services that give the AI "ears" to understand music.

---

## Layer 2: Musical Perception Analyzer

**File**: `backend/services/perception/musical_perception.py`

### Purpose
Analyze individual tracks in musical/perceptual terms that an LLM can understand.

### Class: `MusicalPerceptionAnalyzer`

```python
class MusicalPerceptionAnalyzer:
    """
    Analyzes tracks to produce perceptual descriptions for LLM consumption
    
    Combines:
    - Audio features (from AudioFeaturesAnalyzer)
    - Sample analysis (from SampleAnalyzer)
    - Symbolic analysis (from SymbolicAnalyzer)
    
    Produces:
    - Human-readable timbre descriptions
    - Harmonic function analysis
    - Rhythmic role detection
    - Frequency occupancy mapping
    """
    
    def analyze_track(
        self,
        track: SequencerTrack,
        clips: List[Clip],
        composition: Composition
    ) -> TrackPerception:
        """
        Analyze a single track in context of composition
        
        Returns:
            TrackPerception with perceptual descriptions
        """
```

### Output Model: `TrackPerception`

```python
class TrackPerception(BaseModel):
    """Perceptual analysis of a single track"""
    
    # Identity
    track_id: str
    track_name: str
    
    # Timbre description (LLM-friendly)
    timbre_description: str  # "Bright, percussive kick with short decay"
    
    # Harmonic function
    harmonic_role: str  # "bass", "harmony", "melody", "percussion"
    key_relationship: Optional[str]  # "tonic", "dominant", "chromatic"
    
    # Rhythmic characteristics
    rhythmic_role: str  # "driving groove", "sparse accents", "sustained pad"
    rhythmic_density: str  # "sparse", "moderate", "dense"
    syncopation_level: str  # "none", "light", "heavy"
    
    # Frequency occupancy
    frequency_bands: Dict[str, float]  # {"sub_bass": 0.8, "bass": 0.3, ...}
    dominant_frequency_range: str  # "sub-bass (20-60Hz)"
    
    # Energy characteristics
    energy_profile: str  # "percussive attack", "sustained", "evolving"
    dynamics_range: str  # "narrow", "moderate", "wide"
    
    # Spatial characteristics
    stereo_position: str  # "center", "left", "right", "wide"
    
    # Contextual analysis
    conflicts_with: List[str]  # Track IDs that clash in frequency space
    complements: List[str]  # Track IDs that work well together
```

### Key Methods

```python
def _describe_timbre(self, sample_analysis: SampleAnalysis) -> str:
    """
    Convert spectral/temporal features to natural language
    
    Example outputs:
    - "Bright, percussive kick with short decay and sub-bass emphasis"
    - "Warm, sustained pad with slow attack and rich harmonics"
    - "Crisp, metallic hi-hat with fast decay"
    """

def _detect_harmonic_role(self, midi_notes: List[MIDINote], key: str) -> str:
    """
    Determine harmonic function: bass, harmony, melody, percussion
    
    Logic:
    - Bass: Low pitch range (< C3), root notes, sustained
    - Harmony: Chords (3+ simultaneous notes), mid range
    - Melody: Single notes, wide pitch range, rhythmic variation
    - Percussion: No clear pitch, rhythmic patterns
    """

def _detect_rhythmic_role(self, midi_notes: List[MIDINote]) -> str:
    """
    Classify rhythmic function
    
    Examples:
    - "Driving groove" - consistent 16th notes
    - "Sparse accents" - occasional hits
    - "Sustained pad" - long notes, minimal rhythm
    """

def _analyze_frequency_occupancy(
    self,
    sample_analysis: SampleAnalysis,
    audio_features: AudioFeatures
) -> Dict[str, float]:
    """
    Map which frequency bands this track occupies
    
    Returns:
        {"sub_bass": 0.8, "bass": 0.3, "mid": 0.1, ...}
    """
```

---

## Layer 3: Composition Perception Analyzer

**File**: `backend/services/perception/composition_perception.py`

### Purpose
Analyze how all tracks work together as a complete composition.

### Class: `CompositionPerceptionAnalyzer`

```python
class CompositionPerceptionAnalyzer:
    """
    Analyzes entire composition for multi-track relationships
    
    Detects:
    - Frequency masking between tracks
    - Harmonic relationships
    - Stereo field balance
    - Energy/dynamics over time
    - Mix balance issues
    - Genre/style characteristics
    """
    
    def analyze_composition(
        self,
        composition: Composition,
        track_perceptions: List[TrackPerception]
    ) -> CompositionPerception:
        """
        Analyze full composition
        
        Args:
            composition: Full composition data
            track_perceptions: Per-track perceptual analysis
            
        Returns:
            CompositionPerception with multi-track analysis
        """
```

### Output Model: `CompositionPerception`

```python
class CompositionPerception(BaseModel):
    """Perceptual analysis of entire composition"""
    
    # Overall character
    overall_description: str  # "Sparse, bass-heavy track with minimal mids"
    genre_hints: List[str]  # ["electronic", "minimal", "techno"]
    mood: str  # "dark", "energetic", "calm", "mysterious"
    
    # Frequency analysis
    frequency_balance: Dict[str, float]  # Energy per band across all tracks
    frequency_conflicts: List[FrequencyConflict]  # Tracks clashing
    frequency_gaps: List[str]  # Missing frequency ranges
    
    # Harmonic analysis
    overall_key: Optional[str]  # "C major"
    harmonic_complexity: str  # "simple", "moderate", "complex"
    chord_progression: Optional[str]  # "I-IV-V-I"
    harmonic_conflicts: List[HarmonicConflict]  # Clashing notes
    
    # Rhythmic analysis
    rhythmic_density: str  # "sparse", "moderate", "dense"
    groove_type: str  # "straight", "swung", "syncopated"
    rhythmic_conflicts: List[RhythmicConflict]  # Timing clashes
    
    # Stereo field
    stereo_balance: float  # -1.0 (left) to 1.0 (right)
    stereo_width: str  # "narrow", "moderate", "wide"
    stereo_map: Dict[str, str]  # Track ID -> position
    
    # Energy/dynamics
    energy_curve: List[float]  # Energy over time (per bar)
    dynamics_range: str  # "narrow", "moderate", "wide"
    peak_moments: List[float]  # Beat positions of energy peaks
    
    # Mix balance
    mix_balance: str  # "bass-heavy", "mid-focused", "bright"
    loudness_balance: Dict[str, float]  # Track ID -> relative loudness
    
    # Suggestions
    suggestions: List[str]  # "Add mid-range harmony", "Reduce bass clash"
```

### Key Methods

```python
def _detect_frequency_conflicts(
    self,
    track_perceptions: List[TrackPerception]
) -> List[FrequencyConflict]:
    """
    Find tracks that clash in frequency space
    
    Logic:
    - If two tracks both occupy >0.5 energy in same band → conflict
    - Especially critical in bass/sub-bass ranges
    """

def _analyze_harmonic_relationships(
    self,
    composition: Composition,
    track_perceptions: List[TrackPerception]
) -> Dict[str, Any]:
    """
    Analyze how tracks harmonize together
    
    Detects:
    - Chord progressions across tracks
    - Harmonic clashes (notes outside key)
    - Voice leading quality
    """

def _map_stereo_field(
    self,
    composition: Composition
) -> Dict[str, str]:
    """
    Map where each track sits in stereo field
    
    Returns:
        {"track_id_1": "center", "track_id_2": "left", ...}
    """

def _compute_energy_curve(
    self,
    composition: Composition,
    track_perceptions: List[TrackPerception]
) -> List[float]:
    """
    Compute energy level over time (per bar)
    
    Combines:
    - Note density
    - Velocity
    - Frequency content
    - Number of active tracks
    """

def _generate_suggestions(
    self,
    composition_perception: CompositionPerception
) -> List[str]:
    """
    Generate actionable suggestions for improvement
    
    Examples:
    - "Add mid-range harmony to fill frequency gap"
    - "Reduce bass on Track 2 to avoid masking Track 1"
    - "Pan Track 3 left to widen stereo field"
    """
```

---

## Integration Points

### 1. Perception Context Builder

```python
# In perception_context.py
class PerceptionContextBuilder:
    def __init__(
        self,
        audio_features: AudioFeaturesAnalyzer,
        sample_analyzer: SampleAnalyzer,
        symbolic_analyzer: SymbolicAnalyzer,
        musical_perception: MusicalPerceptionAnalyzer,  # NEW
        composition_perception: CompositionPerceptionAnalyzer  # NEW
    ):
        ...
    
    def build_full_context(self, composition_id: str) -> str:
        """Build complete perceptual context for AI"""
        # 1. Get raw analysis
        # 2. Get track perceptions
        # 3. Get composition perception
        # 4. Format for LLM consumption
```

### 2. Request Router

```python
# In request_router.py
class RequestRouter:
    REQUEST_TYPES = {
        "modify_single_track": {
            "perception_depth": "track",  # Only analyze this track
            "include": ["track_perception", "frequency_conflicts"]
        },
        "add_track": {
            "perception_depth": "composition",  # Full analysis
            "include": ["composition_perception", "frequency_gaps", "suggestions"]
        },
        "create_full_composition": {
            "perception_depth": "generative",  # Use templates
            "include": ["genre_reference", "style_template"]
        }
    }
```

---

## Performance Considerations

1. **Caching**: Cache perception results, invalidate on composition changes
2. **Lazy computation**: Only compute requested depth
3. **Incremental updates**: When single track changes, only re-analyze that track + composition
4. **Token optimization**: Provide summary + details on demand

---

## Next: Implementation Order

1. Create `TrackPerception` and `CompositionPerception` models
2. Implement `MusicalPerceptionAnalyzer`
3. Implement `CompositionPerceptionAnalyzer`
4. Wire into `PerceptionContextBuilder`
5. Test with real compositions

