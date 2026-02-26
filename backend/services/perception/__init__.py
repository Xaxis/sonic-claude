"""
Perception Services - Unified music perception pipeline

This module provides a 3-layer perception pipeline:
- Layer 1: Raw Analysis (audio features, sample analysis, symbolic analysis)
- Layer 2: Musical Perception (track-level understanding)
- Layer 3: Compositional Intelligence (multi-track relationships)

Exports:
    Layer 1 (Raw Analysis):
        AudioFeaturesAnalyzer: Real-time audio feature extraction
        SampleAnalyzer: Sample file analysis with librosa
        SymbolicAnalyzer: MIDI/symbolic music analysis

    Layer 2 (Musical Perception):
        MusicalPerceptionAnalyzer: Track-level perceptual analysis

    Layer 3 (Compositional Intelligence):
        CompositionPerceptionAnalyzer: Mix-level compositional analysis
"""

from backend.services.perception.audio_features import AudioFeaturesAnalyzer
from backend.services.perception.sample_analysis import SampleAnalyzer
from backend.services.perception.symbolic_analysis import SymbolicAnalyzer
from backend.services.perception.musical_perception import MusicalPerceptionAnalyzer
from backend.services.perception.composition_perception import CompositionPerceptionAnalyzer

__all__ = [
    # Layer 1: Raw Analysis
    "AudioFeaturesAnalyzer",
    "SampleAnalyzer",
    "SymbolicAnalyzer",
    # Layer 2: Musical Perception
    "MusicalPerceptionAnalyzer",
    # Layer 3: Compositional Intelligence
    "CompositionPerceptionAnalyzer",
]

