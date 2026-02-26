"""
Composition Perception Analyzer - Layer 3 of the perception pipeline

Analyzes the entire composition for mix-level issues and compositional insights.
Generates actionable feedback for the AI to improve the mix.

Layer 3: Compositional Perception
- Input: Track perceptions (Layer 2) + raw features (Layer 1)
- Output: Mix-level insights (frequency conflicts, harmonic issues, balance)
- Purpose: Give the AI "mixing ears" to understand the overall composition

Design principles:
- Identify problems (frequency masking, harmonic conflicts)
- Provide actionable insights (not just descriptions)
- Use musical terminology the LLM understands
- Focus on what needs improvement
"""
import logging
from typing import List, Dict, Optional
from backend.models.perception import (
    CompositionPerception,
    TrackPerception,
    FrequencyBalance,
    HarmonicConflict
)

logger = logging.getLogger(__name__)


class CompositionPerceptionAnalyzer:
    """
    Analyzes entire composition for mix-level issues

    This is Layer 3 of the perception pipeline:
    - Takes track perceptions (Layer 2)
    - Analyzes frequency balance, harmonic conflicts, mix issues
    - Outputs actionable insights for AI to improve the mix
    """

    def __init__(self):
        """Initialize the composition perception analyzer"""
        self.logger = logging.getLogger(__name__)

    def analyze_composition(
        self,
        composition_id: str,
        composition_name: str,
        track_perceptions: List[TrackPerception],
        tempo: float,
        time_signature: str
    ) -> CompositionPerception:
        """
        Analyze entire composition and generate mix-level insights

        Args:
            composition_id: Composition ID
            composition_name: Composition name
            track_perceptions: List of track perceptions from Layer 2
            tempo: Composition tempo
            time_signature: Time signature

        Returns:
            CompositionPerception with frequency balance, conflicts, and insights
        """
        # Analyze frequency balance
        frequency_balance = self._analyze_frequency_balance(track_perceptions)

        # Detect harmonic conflicts
        harmonic_conflicts = self._detect_harmonic_conflicts(track_perceptions)

        # Generate overall summary
        summary = self._generate_composition_summary(
            composition_name=composition_name,
            track_count=len(track_perceptions),
            frequency_balance=frequency_balance,
            harmonic_conflicts=harmonic_conflicts,
            tempo=tempo
        )

        # Generate actionable insights
        insights = self._generate_insights(
            frequency_balance=frequency_balance,
            harmonic_conflicts=harmonic_conflicts,
            track_perceptions=track_perceptions
        )

        return CompositionPerception(
            composition_id=composition_id,
            composition_name=composition_name,
            track_count=len(track_perceptions),
            frequency_balance=frequency_balance,
            harmonic_conflicts=harmonic_conflicts,
            summary=summary,
            insights=insights
        )

    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================

    def _analyze_frequency_balance(
        self,
        track_perceptions: List[TrackPerception]
    ) -> FrequencyBalance:
        """Analyze frequency balance across all tracks"""
        # Count tracks in each frequency range
        freq_counts: Dict[str, int] = {}
        for track in track_perceptions:
            freq_range = track.dominant_frequency_range
            freq_counts[freq_range] = freq_counts.get(freq_range, 0) + 1

        # Determine which ranges are crowded
        total_tracks = len(track_perceptions)
        crowded_ranges = []
        empty_ranges = []

        # Define expected ranges
        all_ranges = [
            "sub-bass (20-60Hz)",
            "bass (60-250Hz)",
            "low-mids (250-500Hz)",
            "mids (500-2kHz)",
            "high-mids (2k-6kHz)",
            "highs (6k-20kHz)"
        ]

        for freq_range in all_ranges:
            count = freq_counts.get(freq_range, 0)
            if count == 0:
                empty_ranges.append(freq_range)
            elif count > total_tracks * 0.3:  # More than 30% of tracks
                crowded_ranges.append(freq_range)

        # Generate summary
        if crowded_ranges:
            summary = f"Frequency imbalance: {', '.join(crowded_ranges)} overcrowded"
        elif empty_ranges:
            summary = f"Frequency gaps: {', '.join(empty_ranges)} empty"
        else:
            summary = "Balanced frequency distribution"

        return FrequencyBalance(
            crowded_ranges=crowded_ranges,
            empty_ranges=empty_ranges,
            summary=summary
        )

    def _detect_harmonic_conflicts(
        self,
        track_perceptions: List[TrackPerception]
    ) -> List[HarmonicConflict]:
        """Detect harmonic conflicts between tracks"""
        # TODO: Implement sophisticated harmonic conflict detection
        # For now, return empty list (placeholder)
        conflicts = []

        # Future implementation:
        # - Analyze MIDI notes across tracks
        # - Detect dissonant intervals
        # - Identify key conflicts
        # - Find clashing harmonies

        return conflicts

    def _generate_composition_summary(
        self,
        composition_name: str,
        track_count: int,
        frequency_balance: FrequencyBalance,
        harmonic_conflicts: List[HarmonicConflict],
        tempo: float
    ) -> str:
        """Generate natural language summary of composition"""
        parts = [
            f"{composition_name}: {track_count} tracks at {tempo} BPM",
            frequency_balance.summary
        ]

        if harmonic_conflicts:
            parts.append(f"{len(harmonic_conflicts)} harmonic conflicts detected")

        return ". ".join(parts)

    def _generate_insights(
        self,
        frequency_balance: FrequencyBalance,
        harmonic_conflicts: List[HarmonicConflict],
        track_perceptions: List[TrackPerception]
    ) -> List[str]:
        """Generate actionable insights for AI"""
        insights = []

        # Frequency balance insights
        if frequency_balance.crowded_ranges:
            for freq_range in frequency_balance.crowded_ranges:
                insights.append(
                    f"Consider reducing elements in {freq_range} to avoid frequency masking"
                )

        if frequency_balance.empty_ranges:
            for freq_range in frequency_balance.empty_ranges:
                insights.append(
                    f"Consider adding elements in {freq_range} for fuller sound"
                )

        # Harmonic conflict insights
        for conflict in harmonic_conflicts:
            insights.append(
                f"Harmonic conflict between {conflict.track1_name} and {conflict.track2_name}: "
                f"{conflict.description}"
            )

        # Track role insights
        role_counts: Dict[str, int] = {}
        for track in track_perceptions:
            role = track.role
            role_counts[role] = role_counts.get(role, 0) + 1

        # Check for missing essential roles
        has_bass = any("bass" in role.lower() for role in role_counts.keys())
        has_rhythm = any("rhythm" in role.lower() or "percussion" in role.lower() for role in role_counts.keys())

        if not has_bass:
            insights.append("Consider adding a bass foundation for low-end support")

        if not has_rhythm:
            insights.append("Consider adding rhythmic elements for groove")

        # If no insights, composition is well-balanced
        if not insights:
            insights.append("Composition is well-balanced across frequency ranges and roles")

        return insights
