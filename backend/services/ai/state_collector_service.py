"""
DAW State Service - Efficient state aggregation and change detection

Performance optimizations:
- State caching with hash-based change detection
- Incremental diffs to minimize token usage
- Lazy loading of expensive computations
- Configurable detail levels
"""
import logging
import hashlib
import json
from typing import Optional
from datetime import datetime

from backend.models.daw_state import (
    DAWStateSnapshot,
    DAWStateDiff,
    CompactSequence,
    CompactTrack,
    CompactClip,
    CompactMIDINote,
    AudioFeatures,
    MusicalContext,
    StateDetailLevel,
    GetStateResponse
)
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.mixer_service import MixerService
from backend.core.engine_manager import AudioEngineManager

logger = logging.getLogger(__name__)


class DAWStateService:
    """
    Aggregates DAW state from multiple services
    Provides efficient serialization and change detection
    """

    def __init__(
        self,
        composition_state_service: CompositionStateService,
        mixer_service: MixerService,
        engine_manager: AudioEngineManager,
        audio_feature_extractor=None,
        musical_context_analyzer=None,
        sample_analyzer=None
    ):
        self.composition_state = composition_state_service
        self.mixer = mixer_service
        self.sample_analyzer = sample_analyzer
        self.engine = engine_manager
        self.audio_feature_extractor = audio_feature_extractor
        self.musical_context_analyzer = musical_context_analyzer

        # Cache for change detection
        self._last_state_hash: Optional[str] = None
        self._last_snapshot: Optional[DAWStateSnapshot] = None

        # Audio analysis cache (updated from real-time data)
        self._audio_features: Optional[AudioFeatures] = None
        self._musical_context: Optional[MusicalContext] = None
    
    def update_audio_features(self, features: AudioFeatures):
        """Update cached audio features (called from WebSocket handlers)"""
        self._audio_features = features
    
    def update_musical_context(self, context: MusicalContext):
        """Update cached musical context (called when MIDI changes)"""
        self._musical_context = context

    def analyze_current_sequence(self) -> None:
        """Analyze current sequence and update musical context (called on MIDI changes)"""
        if not self.musical_context_analyzer:
            return

        if self.composition_state.current_composition_id:
            composition = self.composition_state.compositions.get(self.composition_state.current_composition_id)
            if composition:
                context = self.musical_context_analyzer.analyze_sequence(composition)
                self.update_musical_context(context)

    def get_state(
        self,
        detail: StateDetailLevel = StateDetailLevel(),
        previous_hash: Optional[str] = None
    ) -> GetStateResponse:
        """
        Get current DAW state with optional diff detection
        
        Args:
            detail: Control level of detail to include
            previous_hash: Previous state hash for diff detection
        
        Returns:
            Full state or diff if hash matches
        """
        # Build current snapshot
        snapshot = self._build_snapshot(detail)
        
        # Compute hash
        state_hash = self._compute_hash(snapshot)
        snapshot.state_hash = state_hash
        
        # Check if state changed
        if previous_hash and previous_hash == state_hash:
            # No changes - return minimal response
            return GetStateResponse(
                full_state=None,
                diff=None,
                is_diff=False
            )
        
        # Check if we can compute diff
        if previous_hash and self._last_snapshot and self._last_state_hash == previous_hash:
            diff = self._compute_diff(self._last_snapshot, snapshot)
            self._last_snapshot = snapshot
            self._last_state_hash = state_hash
            
            return GetStateResponse(
                full_state=None,
                diff=diff,
                is_diff=True
            )
        
        # Return full state
        self._last_snapshot = snapshot
        self._last_state_hash = state_hash
        
        return GetStateResponse(
            full_state=snapshot,
            diff=None,
            is_diff=False
        )
    
    def _build_snapshot(self, detail: StateDetailLevel) -> DAWStateSnapshot:
        """Build state snapshot from current services"""
        # Get playback state
        playback = self.composition_state.get_playback_state()

        # Get current sequence (if any)
        # Priority: 1) Currently playing sequence, 2) Most recently modified, 3) First available
        sequence = None
        sequence_id = None

        if playback["current_sequence"]:
            # Use currently playing sequence
            sequence_id = playback["current_sequence"]
        elif self.composition_state.sequences:
            # Not playing - get most recently modified sequence
            # Sort by updated_at timestamp (most recent first)
            sorted_sequences = sorted(
                self.composition_state.sequences.items(),
                key=lambda x: x[1].updated_at if hasattr(x[1], 'updated_at') else datetime.min,
                reverse=True
            )
            if sorted_sequences:
                sequence_id = sorted_sequences[0][0]

        if sequence_id:
            comp_data = self.composition_state.compositions.get(sequence_id)
            if comp_data:
                sequence = self._convert_sequence(comp_data, detail)

        # Build snapshot
        snapshot = DAWStateSnapshot(
            timestamp=datetime.now(),
            playing=playback["is_playing"],
            position=playback["playhead_position"],
            tempo=playback["tempo"],
            sequence=sequence,
            audio=self._audio_features if detail.include_audio_analysis else None,
            musical=self._musical_context if detail.include_musical_analysis else None
        )

        return snapshot
    
    def _convert_sequence(self, seq, detail: StateDetailLevel) -> CompactSequence:
        """Convert full sequence to compact representation"""
        # Convert tracks
        tracks = [
            CompactTrack(
                id=track.id,
                name=track.name,
                type=track.type,
                instrument=track.instrument,
                vol=track.volume,
                pan=track.pan,
                muted=track.is_muted,
                solo=track.is_solo
            )
            for track in seq.tracks
        ]
        
        # Convert clips (with optional limits)
        clips = []
        clip_limit = detail.max_clips if detail.include_clips else 0
        
        for i, clip in enumerate(seq.clips):
            if clip_limit and i >= clip_limit:
                break
            
            compact_clip = CompactClip(
                id=clip.id,
                name=clip.name,
                track=clip.track_id,
                type=clip.type,
                start=clip.start_time,
                dur=clip.duration,
                muted=clip.is_muted
            )

            # Add MIDI notes if requested
            if detail.include_notes and clip.type == "midi" and clip.midi_events:
                note_limit = detail.max_notes_per_clip
                notes = [
                    CompactMIDINote(n=note.note, s=note.start_time, d=note.duration, v=note.velocity)
                    for j, note in enumerate(clip.midi_events)
                    if not note_limit or j < note_limit
                ]
                compact_clip.notes = notes

            # Add audio file path and analysis for audio clips
            if clip.type == "audio" and clip.audio_file_path:
                compact_clip.file = clip.audio_file_path

                # Add audio analysis if sample analyzer is available
                if self.sample_analyzer:
                    analysis = self.sample_analyzer.analyze_sample(clip.audio_file_path)
                    if analysis:
                        compact_clip.audio_analysis = {
                            "summary": analysis.summary,
                            "spectral": {
                                "centroid": round(analysis.spectral.centroid, 1),
                                "brightness": round(analysis.timbre.brightness, 2),
                                "sub_bass": round(analysis.spectral.sub_bass_energy, 2),
                                "bass": round(analysis.spectral.bass_energy, 2),
                                "mid": round(analysis.spectral.mid_energy, 2),
                                "high": round(analysis.spectral.high_energy, 2)
                            },
                            "temporal": {
                                "attack_time": round(analysis.temporal.attack_time, 3),
                                "is_percussive": analysis.temporal.is_percussive,
                                "is_sustained": analysis.temporal.is_sustained
                            },
                            "pitch": {
                                "has_pitch": analysis.pitch.has_pitch,
                                "midi_note": analysis.pitch.midi_note,
                                "fundamental_freq": round(analysis.pitch.fundamental_freq, 1) if analysis.pitch.fundamental_freq else None
                            },
                            "timbre": {
                                "warmth": round(analysis.timbre.warmth, 2),
                                "roughness": round(analysis.timbre.roughness, 2),
                                "tags": analysis.timbre.tags
                            }
                        }

            clips.append(compact_clip)
        
        return CompactSequence(
            id=seq.id,
            name=seq.name,
            tempo=seq.tempo,
            time_sig=seq.time_signature,
            tracks=tracks,
            clips=clips
        )

    def _compute_hash(self, snapshot: DAWStateSnapshot) -> str:
        """Compute hash of state for change detection"""
        # Serialize to JSON (excluding timestamp and hash)
        data = snapshot.model_dump(exclude={"timestamp", "state_hash", "audio"})
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(json_str.encode()).hexdigest()

    def _compute_diff(self, old: DAWStateSnapshot, new: DAWStateSnapshot) -> DAWStateDiff:
        """Compute difference between two snapshots"""
        changed_fields = []
        changes = {}

        # Compare top-level fields
        if old.playing != new.playing:
            changed_fields.append("playing")
            changes["playing"] = new.playing

        if old.position != new.position:
            changed_fields.append("position")
            changes["position"] = new.position

        if old.tempo != new.tempo:
            changed_fields.append("tempo")
            changes["tempo"] = new.tempo

        # Compare audio features (if present)
        if new.audio and (not old.audio or old.audio != new.audio):
            changed_fields.append("audio")
            changes["audio"] = new.audio.model_dump()

        # For sequence changes, just flag it (full diff would be complex)
        if old.sequence != new.sequence:
            changed_fields.append("sequence")
            changes["sequence"] = new.sequence.model_dump() if new.sequence else None

        return DAWStateDiff(
            timestamp=datetime.now(),
            changed_fields=changed_fields,
            changes=changes
        )

