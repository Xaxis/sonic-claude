"""
Musical Perception Analyzer - Layer 2 of the perception pipeline

Translates technical features into perceptual descriptions for LLM understanding.
Generates natural language descriptions of timbre, rhythm, and musical character.

Layer 2: Musical Perception
- Input: Raw audio/MIDI features (Layer 1)
- Output: Perceptual descriptions (timbre, rhythm, character)
- Purpose: Give the AI "ears" to understand how music sounds

Design principles:
- Generate human-readable descriptions
- Use musical terminology the LLM understands
- Provide actionable insights (not just numbers)
- Cache results (expensive to compute)
"""
import logging
from typing import List, Optional, Dict, Any
from backend.models.perception import (
    TrackPerception,
    ClipPerception,
    TimbreDescription,
    RhythmDescription
)
from backend.models.sequence import Clip, MIDIClip, AudioClip
from backend.models.sample_analysis import SampleAnalysis

logger = logging.getLogger(__name__)


class MusicalPerceptionAnalyzer:
    """
    Analyzes tracks and clips to generate perceptual descriptions

    This is Layer 2 of the perception pipeline:
    - Takes raw features (audio analysis, MIDI data)
    - Generates perceptual descriptions (timbre, rhythm, character)
    - Outputs natural language summaries for LLM
    """

    def __init__(self):
        """Initialize the musical perception analyzer"""
        self.logger = logging.getLogger(__name__)

    def analyze_track(
        self,
        track_id: str,
        track_name: str,
        track_type: str,
        clips: List[Clip],
        sample_analysis: Optional[SampleAnalysis] = None,
        audio_features: Optional[Dict[str, Any]] = None
    ) -> TrackPerception:
        """
        Analyze a track and generate perceptual description

        Args:
            track_id: Track ID
            track_name: Track name
            track_type: Track type (midi, audio, sample)
            clips: Clips on this track
            sample_analysis: Sample analysis (for sample tracks)
            audio_features: Real-time audio features (if available)

        Returns:
            TrackPerception with timbre, rhythm, and role descriptions
        """
        # Generate timbre description
        timbre = self._analyze_timbre(
            track_type=track_type,
            sample_analysis=sample_analysis,
            audio_features=audio_features
        )

        # Generate rhythm description
        rhythm = self._analyze_rhythm(
            clips=clips,
            track_type=track_type
        )

        # Determine track role
        role = self._determine_track_role(
            track_name=track_name,
            track_type=track_type,
            timbre=timbre,
            rhythm=rhythm
        )

        # Determine dominant frequency range
        freq_range = self._determine_frequency_range(
            track_type=track_type,
            sample_analysis=sample_analysis,
            timbre=timbre
        )

        # Generate overall summary
        summary = self._generate_track_summary(
            track_name=track_name,
            timbre=timbre,
            rhythm=rhythm,
            role=role,
            freq_range=freq_range
        )

        return TrackPerception(
            track_id=track_id,
            track_name=track_name,
            timbre=timbre,
            rhythm=rhythm,
            role=role,
            dominant_frequency_range=freq_range,
            summary=summary
        )

    def analyze_clip(
        self,
        clip: Clip,
        track_name: str
    ) -> ClipPerception:
        """
        Analyze a clip and generate perceptual description

        Args:
            clip: Clip to analyze
            track_name: Name of the track this clip belongs to

        Returns:
            ClipPerception with character and harmonic descriptions
        """
        character = self._analyze_clip_character(clip)
        harmonic_summary = None

        if isinstance(clip, MIDIClip) and clip.notes:
            harmonic_summary = self._analyze_harmonic_content(clip.notes)

        return ClipPerception(
            clip_id=clip.id,
            clip_name=clip.name,
            track_id=clip.track_id,
            character=character,
            harmonic_summary=harmonic_summary
        )




    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================

    def _analyze_timbre(
        self,
        track_type: str,
        sample_analysis: Optional[SampleAnalysis],
        audio_features: Optional[Dict[str, Any]]
    ) -> TimbreDescription:
        """Generate timbre description from audio analysis"""
        brightness = 0.5
        warmth = 0.5
        roughness = 0.0
        fullness = 0.5
        character = []

        # Use sample analysis if available
        if sample_analysis:
            timbre_desc = sample_analysis.timbre
            brightness = timbre_desc.brightness
            warmth = timbre_desc.warmth
            roughness = timbre_desc.roughness
            fullness = timbre_desc.fullness
            character = timbre_desc.tags

        # Generate summary
        descriptors = []
        if brightness > 0.7:
            descriptors.append("bright")
        elif brightness < 0.3:
            descriptors.append("dark")

        if warmth > 0.7:
            descriptors.append("warm")
        elif warmth < 0.3:
            descriptors.append("cold")

        if roughness > 0.5:
            descriptors.append("rough")
        else:
            descriptors.append("smooth")

        if fullness > 0.7:
            descriptors.append("full")
        elif fullness < 0.3:
            descriptors.append("thin")

        summary = ", ".join(descriptors) if descriptors else "neutral timbre"

        return TimbreDescription(
            brightness=brightness,
            warmth=warmth,
            roughness=roughness,
            fullness=fullness,
            character=character,
            summary=summary
        )

    def _analyze_rhythm(
        self,
        clips: List[Clip],
        track_type: str
    ) -> RhythmDescription:
        """Generate rhythm description from MIDI clips"""
        density = 0.0
        syncopation = 0.0
        groove = 0.0
        pattern_type = None

        # Analyze MIDI clips for rhythm
        midi_clips = [c for c in clips if isinstance(c, MIDIClip)]
        if midi_clips:
            total_notes = sum(len(c.notes) for c in midi_clips)
            total_duration = sum(c.duration for c in midi_clips)
            if total_duration > 0:
                density = total_notes / total_duration

        # Generate summary
        if density > 2.0:
            summary = "dense, busy rhythm"
        elif density > 1.0:
            summary = "moderate rhythm"
        elif density > 0.5:
            summary = "sparse rhythm"
        else:
            summary = "minimal rhythm"

        return RhythmDescription(
            density=density,
            syncopation=syncopation,
            groove=groove,
            pattern_type=pattern_type,
            summary=summary
        )

    def _determine_track_role(
        self,
        track_name: str,
        track_type: str,
        timbre: TimbreDescription,
        rhythm: RhythmDescription
    ) -> str:
        """Determine the track's role in the mix"""
        name_lower = track_name.lower()

        if any(word in name_lower for word in ["kick", "bass drum"]):
            return "bass foundation (kick)"
        elif any(word in name_lower for word in ["bass", "sub"]):
            return "bass foundation"
        elif any(word in name_lower for word in ["lead", "melody"]):
            return "lead melody"
        elif any(word in name_lower for word in ["pad", "strings", "atmosphere"]):
            return "harmonic pad"
        elif any(word in name_lower for word in ["drum", "percussion", "hat", "snare"]):
            return "rhythmic percussion"
        elif any(word in name_lower for word in ["chord", "piano", "guitar"]):
            return "harmonic accompaniment"
        else:
            # Use timbre/rhythm to guess
            if rhythm.density > 2.0:
                return "rhythmic element"
            elif timbre.brightness > 0.7:
                return "melodic element"
            else:
                return "supporting element"

    def _determine_frequency_range(
        self,
        track_type: str,
        sample_analysis: Optional[SampleAnalysis],
        timbre: TimbreDescription
    ) -> str:
        """Determine dominant frequency range"""
        # Use sample analysis if available
        if sample_analysis and sample_analysis.spectral:
            centroid = sample_analysis.spectral.centroid
            if centroid < 200:
                return "sub-bass (20-60Hz)"
            elif centroid < 500:
                return "bass (60-250Hz)"
            elif centroid < 1000:
                return "low-mids (250-500Hz)"
            elif centroid < 2000:
                return "mids (500-2kHz)"
            elif centroid < 6000:
                return "high-mids (2k-6kHz)"
            else:
                return "highs (6k-20kHz)"

        # Fallback to timbre-based guess
        if timbre.brightness > 0.7:
            return "high-mids (2k-6kHz)"
        elif timbre.brightness < 0.3:
            return "bass (60-250Hz)"
        else:
            return "mids (500-2kHz)"


    def _generate_track_summary(
        self,
        track_name: str,
        timbre: TimbreDescription,
        rhythm: RhythmDescription,
        role: str,
        freq_range: str
    ) -> str:
        """Generate natural language summary of track perception"""
        return f"{track_name}: {timbre.summary} {role} with {rhythm.summary} in the {freq_range}"

    def _analyze_clip_character(self, clip: Clip) -> str:
        """Analyze clip character"""
        if isinstance(clip, MIDIClip):
            note_count = len(clip.notes) if clip.notes else 0
            if note_count > 20:
                return "dense musical phrase"
            elif note_count > 5:
                return "melodic phrase"
            else:
                return "sparse musical idea"
        else:
            return "audio clip"

    def _analyze_harmonic_content(self, notes: List) -> str:
        """Analyze harmonic content of MIDI notes"""
        if not notes:
            return "no notes"

        note_count = len(notes)
        if note_count == 1:
            return "single note"
        elif note_count <= 3:
            return "simple interval or chord"
        else:
            return "complex harmonic content"

