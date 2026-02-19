"""
Musical Context Analyzer - Extract musical information from MIDI data

Performance optimizations:
- Only analyzes when MIDI changes (event-driven)
- Lightweight algorithms (no ML models)
- Cached results
"""
import logging
from typing import List, Optional, Dict
from collections import Counter

from backend.models.sequence import Sequence, MIDINote
from backend.models.daw_state import MusicalContext

logger = logging.getLogger(__name__)


class MusicalContextAnalyzer:
    """
    Analyzes MIDI sequences to extract musical context
    Key detection, complexity metrics, etc.
    """
    
    # Major and minor key profiles (Krumhansl-Schmuckler)
    MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
    MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
    
    NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    
    def __init__(self):
        self._cached_context: Optional[MusicalContext] = None
        self._last_sequence_hash: Optional[int] = None
    
    def analyze_sequence(self, sequence: Sequence) -> MusicalContext:
        """
        Analyze sequence to extract musical context
        
        Args:
            sequence: Sequence to analyze
        
        Returns:
            MusicalContext with key, scale, complexity, etc.
        """
        # Check cache
        sequence_hash = self._compute_sequence_hash(sequence)
        if self._last_sequence_hash == sequence_hash and self._cached_context:
            return self._cached_context
        
        # Collect all MIDI notes from all clips
        all_notes: List[MIDINote] = []
        for clip in sequence.clips:
            if clip.type == "midi" and clip.midi_events:
                all_notes.extend(clip.midi_events)
        
        # If no notes, return default context
        if not all_notes:
            context = MusicalContext(
                key=None,
                scale=None,
                note_density=0.0,
                pitch_range=(60, 72),
                complexity=0.0
            )
            self._cached_context = context
            self._last_sequence_hash = sequence_hash
            return context
        
        # Analyze
        key, scale = self._detect_key(all_notes)
        note_density = self._compute_note_density(all_notes, sequence.tempo)
        pitch_range = self._compute_pitch_range(all_notes)
        complexity = self._compute_complexity(all_notes)
        
        context = MusicalContext(
            key=f"{key} {scale}" if key and scale else None,
            scale=scale,
            note_density=note_density,
            pitch_range=pitch_range,
            complexity=complexity
        )
        
        # Cache
        self._cached_context = context
        self._last_sequence_hash = sequence_hash
        
        return context
    
    def _detect_key(self, notes: List[MIDINote]) -> tuple[Optional[str], Optional[str]]:
        """
        Detect key using Krumhansl-Schmuckler algorithm
        
        Returns:
            (key_name, scale_type) e.g. ("C", "major")
        """
        if not notes:
            return None, None
        
        # Build pitch class histogram (weighted by duration)
        pitch_class_weights = [0.0] * 12
        for note in notes:
            pitch_class = note.note % 12
            pitch_class_weights[pitch_class] += note.duration
        
        # Normalize
        total = sum(pitch_class_weights)
        if total == 0:
            return None, None
        pitch_class_weights = [w / total for w in pitch_class_weights]
        
        # Correlate with key profiles
        best_correlation = -1.0
        best_key = None
        best_scale = None
        
        for tonic in range(12):
            # Rotate profile to match tonic
            major_rotated = self.MAJOR_PROFILE[tonic:] + self.MAJOR_PROFILE[:tonic]
            minor_rotated = self.MINOR_PROFILE[tonic:] + self.MINOR_PROFILE[:tonic]
            
            # Compute correlation
            major_corr = self._correlation(pitch_class_weights, major_rotated)
            minor_corr = self._correlation(pitch_class_weights, minor_rotated)
            
            if major_corr > best_correlation:
                best_correlation = major_corr
                best_key = self.NOTE_NAMES[tonic]
                best_scale = "major"
            
            if minor_corr > best_correlation:
                best_correlation = minor_corr
                best_key = self.NOTE_NAMES[tonic]
                best_scale = "minor"
        
        return best_key, best_scale
    
    def _compute_note_density(self, notes: List[MIDINote], tempo: float) -> float:
        """
        Compute notes per beat
        
        Returns:
            Average notes per beat
        """
        if not notes:
            return 0.0
        
        # Find total time span
        max_time = max(note.start_time + note.duration for note in notes)
        if max_time == 0:
            return 0.0
        
        # Notes per beat
        return len(notes) / max_time
    
    def _compute_pitch_range(self, notes: List[MIDINote]) -> tuple[int, int]:
        """Compute min/max MIDI note numbers"""
        if not notes:
            return (60, 72)
        
        pitches = [note.note for note in notes]
        return (min(pitches), max(pitches))
    
    def _compute_complexity(self, notes: List[MIDINote]) -> float:
        """
        Compute rhythmic/harmonic complexity (0-1)
        
        Simple heuristic:
        - More unique note durations = more complex
        - Wider pitch range = more complex
        - More notes = more complex
        """
        if not notes:
            return 0.0
        
        # Unique durations (rhythmic complexity)
        unique_durations = len(set(note.duration for note in notes))
        duration_complexity = min(1.0, unique_durations / 10.0)
        
        # Pitch range (harmonic complexity)
        pitch_range = self._compute_pitch_range(notes)
        range_complexity = min(1.0, (pitch_range[1] - pitch_range[0]) / 48.0)
        
        # Note count (density complexity)
        count_complexity = min(1.0, len(notes) / 100.0)
        
        # Average
        return (duration_complexity + range_complexity + count_complexity) / 3.0
    
    @staticmethod
    def _correlation(a: List[float], b: List[float]) -> float:
        """Compute Pearson correlation coefficient"""
        import math
        
        n = len(a)
        sum_a = sum(a)
        sum_b = sum(b)
        sum_a_sq = sum(x * x for x in a)
        sum_b_sq = sum(x * x for x in b)
        sum_ab = sum(x * y for x, y in zip(a, b))
        
        numerator = n * sum_ab - sum_a * sum_b
        denominator = math.sqrt((n * sum_a_sq - sum_a ** 2) * (n * sum_b_sq - sum_b ** 2))
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator
    
    @staticmethod
    def _compute_sequence_hash(sequence: Sequence) -> int:
        """Compute hash of sequence for cache invalidation"""
        # Hash based on clip count and total notes
        clip_count = len(sequence.clips)
        note_count = sum(
            len(clip.midi_events) if clip.midi_events else 0
            for clip in sequence.clips
        )
        return hash((sequence.id, clip_count, note_count, sequence.tempo))

