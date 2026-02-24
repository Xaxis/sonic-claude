"""
Composition State Service - Manages in-memory composition state

ARCHITECTURE:
- CompositionStateService stores compositions in memory (self.compositions dict)
- Handles CRUD operations for compositions, tracks, and clips
- Does NOT handle playback (that's PlaybackEngineService)
- Persistence handled by CompositionService (save/load to disk)
- ONE ID: composition_id (no separate sequence_id)
"""
import logging
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from backend.models.composition import Composition
from backend.models.sequence import (
    Clip,
    Track,
    MIDINote,
    AddClipRequest,
    UpdateClipRequest,
)

logger = logging.getLogger(__name__)


class CompositionStateService:
    """
    Manages in-memory composition state (compositions, tracks, clips)

    Responsibilities:
    - Store compositions in memory (self.compositions dict)
    - CRUD operations for compositions, tracks, clips
    - Sample reference management
    - Persistence handled by CompositionService
    - Playback handled by PlaybackEngineService
    """

    def __init__(self) -> None:
        """Initialize composition state service"""
        # State storage (in-memory ONLY - persistence handled by CompositionService)
        self.compositions: Dict[str, Composition] = {}  # composition_id -> Composition
        self.current_composition_id: Optional[str] = None  # Active composition

        # Callback for composition changes (for AI musical context analysis)
        self.on_composition_changed: Optional[callable] = None

        logger.info("✅ CompositionStateService initialized")

    # ========================================================================
    # COMPOSITION MANAGEMENT
    # ========================================================================

    def create_composition(self, name: str, tempo: float = 120.0, time_signature: str = "4/4") -> Composition:
        """
        Create a new composition

        NOTE: This is typically called by the compositions API, not directly.
        The API will also call CompositionService.save_composition() to persist.

        Args:
            name: Composition name
            tempo: Tempo in BPM
            time_signature: Time signature (e.g., "4/4")

        Returns:
            Created composition
        """
        composition_id = str(uuid.uuid4())
        composition = Composition(
            id=composition_id,
            name=name,
            tempo=tempo,
            time_signature=time_signature,
            tracks=[],
            clips=[],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        self.compositions[composition_id] = composition
        self.current_composition_id = composition_id
        logger.info(f"✅ Created composition: {name} (ID: {composition_id})")
        return composition

    def get_composition(self, composition_id: str) -> Optional[Composition]:
        """Get composition by ID"""
        return self.compositions.get(composition_id)

    def get_all_compositions(self) -> List[Composition]:
        """Get all compositions"""
        return list(self.compositions.values())

    def delete_composition(self, composition_id: str) -> bool:
        """Delete composition from memory"""
        if composition_id in self.compositions:
            del self.compositions[composition_id]
            if self.current_composition_id == composition_id:
                self.current_composition_id = None
            logger.info(f"✅ Deleted composition: {composition_id}")
            return True
        return False

    def switch_composition(
        self,
        composition_id: str,
        mixer_service: Optional['MixerService'] = None,
        effects_service: Optional['TrackEffectsService'] = None
    ) -> Optional[Composition]:
        """
        Switch to a different composition

        Args:
            composition_id: ID of composition to switch to
            mixer_service: Mixer service (to load mixer state)
            effects_service: Effects service (to load effect chains)

        Returns:
            The switched-to composition, or None if not found
        """
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return None

        # Update current composition
        self.current_composition_id = composition_id

        # Load mixer state if mixer service provided
        if mixer_service and composition.mixer_state:
            mixer_service.load_state(composition.mixer_state)
            logger.info(f"✅ Loaded mixer state for composition {composition_id}")

        # Load effect chains if effects service provided
        if effects_service and composition.track_effects:
            effects_service.load_effects(composition.track_effects)
            logger.info(f"✅ Loaded {len(composition.track_effects)} effect chains")

        logger.info(f"✅ Switched to composition: {composition.name} (ID: {composition_id})")
        return composition

    # ========================================================================
    # TRACK MANAGEMENT
    # ========================================================================

    def create_track(
        self,
        composition_id: str,
        name: str,
        track_type: str = "sample",
        color: str = "#3b82f6",
        sample_id: Optional[str] = None,
        sample_name: Optional[str] = None,
        sample_file_path: Optional[str] = None,
        instrument: Optional[str] = None
    ) -> Optional[Track]:
        """Create a new track in a composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return None

        track_id = str(uuid.uuid4())
        track = Track(
            id=track_id,
            name=name,
            composition_id=composition_id,
            type=track_type,
            color=color,
            is_muted=False,
            is_solo=False,
            is_armed=False,
            volume=1.0,
            pan=0.0,
            sample_id=sample_id,
            sample_name=sample_name,
            sample_file_path=sample_file_path,
            instrument=instrument
        )

        # Add track to composition
        composition.tracks.append(track)
        composition.updated_at = datetime.now()

        logger.info(f"✅ Created track: {name} (ID: {track_id}) in composition {composition_id}")
        return track

    def get_tracks(self, composition_id: Optional[str] = None) -> List[Track]:
        """Get all tracks, optionally filtered by composition"""
        if composition_id:
            composition = self.compositions.get(composition_id)
            return composition.tracks if composition else []

        # Return all tracks from all compositions
        all_tracks = []
        for composition in self.compositions.values():
            all_tracks.extend(composition.tracks)
        return all_tracks

    def get_track(self, track_id: str) -> Optional[Track]:
        """Get track by ID (searches all compositions)"""
        for composition in self.compositions.values():
            for track in composition.tracks:
                if track.id == track_id:
                    return track
        return None

    def update_track(
        self,
        composition_id: str,
        track_id: str,
        name: Optional[str] = None,
        volume: Optional[float] = None,
        pan: Optional[float] = None,
        instrument: Optional[str] = None
    ) -> Optional[Track]:
        """Update track properties"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return None

        for track in composition.tracks:
            if track.id == track_id:
                # Only update attributes that are provided
                if name is not None:
                    track.name = name
                if volume is not None:
                    track.volume = volume
                if pan is not None:
                    track.pan = pan
                if instrument is not None:
                    track.instrument = instrument

                composition.updated_at = datetime.now()
                logger.info(f"📝 Updated track {track_id}")
                return track

        return None

    def delete_track(self, track_id: str) -> bool:
        """Delete track from its composition"""
        for composition in self.compositions.values():
            for i, track in enumerate(composition.tracks):
                if track.id == track_id:
                    # Delete all clips on this track
                    composition.clips = [c for c in composition.clips if c.track_id != track_id]
                    # Delete the track
                    composition.tracks.pop(i)
                    composition.updated_at = datetime.now()
                    logger.info(f"🗑️ Deleted track: {track_id}")
                    return True
        return False

    def set_track_mute(self, composition_id: str, track_id: str, is_muted: bool) -> bool:
        """Set track mute state"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return False

        for track in composition.tracks:
            if track.id == track_id:
                track.is_muted = is_muted
                composition.updated_at = datetime.now()
                logger.info(f"🔇 Set track {track_id} mute: {is_muted}")
                return True

        return False

    def set_track_solo(self, composition_id: str, track_id: str, is_solo: bool) -> bool:
        """Set track solo state"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return False

        for track in composition.tracks:
            if track.id == track_id:
                track.is_solo = is_solo
                composition.updated_at = datetime.now()
                logger.info(f"🎧 Set track {track_id} solo: {is_solo}")
                return True

        return False

    def update_sample_references(self, sample_id: str, new_name: str) -> int:
        """Update sample references across all tracks"""
        count = 0
        for composition in self.compositions.values():
            for track in composition.tracks:
                if track.sample_id == sample_id:
                    track.sample_name = new_name
                    count += 1
        logger.info(f"📝 Updated {count} sample references for sample {sample_id}")
        return count

    def check_sample_in_use(self, sample_id: str) -> Tuple[bool, List[str]]:
        """Check if a sample is in use by any tracks"""
        track_names = []
        for composition in self.compositions.values():
            for track in composition.tracks:
                if track.sample_id == sample_id:
                    track_names.append(f"{track.name} (in {composition.name})")
        return len(track_names) > 0, track_names

    # ========================================================================
    # CLIP MANAGEMENT
    # ========================================================================

    def add_clip(self, composition_id: str, request: AddClipRequest) -> Optional[Clip]:
        """Add a clip to a composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return None

        clip_id = str(uuid.uuid4())
        clip = Clip(
            id=clip_id,
            name=request.name or f"{request.clip_type.upper()} Clip",
            type=request.clip_type,
            track_id=request.track_id,
            start_time=request.start_time,
            duration=request.duration,
            is_muted=False,
            is_looped=False,
            gain=1.0,
            midi_events=request.midi_events if request.clip_type == "midi" else None,
            audio_file_path=request.audio_file_path if request.clip_type == "audio" else None,
            audio_offset=0.0 if request.clip_type == "audio" else None,
        )

        composition.clips.append(clip)
        composition.updated_at = datetime.now()

        logger.info(f"✅ Added {request.clip_type} clip to composition {composition_id}")
        return clip

    def get_clips(self, composition_id: str) -> Optional[List[Clip]]:
        """Get all clips in a composition"""
        composition = self.compositions.get(composition_id)
        return composition.clips if composition else None

    def update_clip(
        self,
        composition_id: str,
        clip_id: str,
        request: UpdateClipRequest
    ) -> Optional[Clip]:
        """Update a clip"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return None

        for clip in composition.clips:
            if clip.id == clip_id:
                # Only update attributes that exist in UpdateClipRequest
                if request.start_time is not None:
                    clip.start_time = request.start_time
                if request.duration is not None:
                    clip.duration = request.duration
                if request.is_muted is not None:
                    clip.is_muted = request.is_muted
                if request.is_looped is not None:
                    clip.is_looped = request.is_looped
                if request.gain is not None:
                    clip.gain = request.gain
                if request.midi_events is not None:
                    clip.midi_events = request.midi_events
                if request.audio_offset is not None:
                    clip.audio_offset = request.audio_offset

                composition.updated_at = datetime.now()
                logger.info(f"📝 Updated clip {clip_id}")
                return clip

        return None

    def delete_clip(self, composition_id: str, clip_id: str) -> bool:
        """Delete a clip"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return False

        for i, clip in enumerate(composition.clips):
            if clip.id == clip_id:
                composition.clips.pop(i)
                composition.updated_at = datetime.now()
                logger.info(f"🗑️ Deleted clip {clip_id}")
                return True

        return False

    def duplicate_clip(self, composition_id: str, clip_id: str) -> Optional[Clip]:
        """Duplicate a clip"""
        composition = self.compositions.get(composition_id)
        if not composition:
            return None

        for clip in composition.clips:
            if clip.id == clip_id:
                new_clip_id = str(uuid.uuid4())
                new_clip = clip.model_copy(update={
                    "id": new_clip_id,
                    "name": f"{clip.name} (Copy)",
                    "start_time": clip.start_time + clip.duration  # Place after original
                })
                composition.clips.append(new_clip)
                composition.updated_at = datetime.now()
                logger.info(f"📋 Duplicated clip {clip_id} -> {new_clip_id}")
                return new_clip

        return None

