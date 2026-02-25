"""
Composition State Service - Manages in-memory composition state

ARCHITECTURE:
- CompositionStateService stores compositions in memory (self.compositions dict)
- Handles CRUD operations for compositions, tracks, and clips
- Does NOT handle playback (that's PlaybackEngineService)
- Persistence handled by CompositionService (save/load to disk)
- ONE ID: composition_id (no separate sequence_id)

UNDO/REDO SYSTEM (BUILT-IN):
- Each composition has its own undo/redo stacks (in-memory only)
- Before any mutation, push current state to undo stack
- Undo pops from undo stack, pushes to redo stack
- Redo pops from redo stack, pushes to undo stack
- New mutation clears redo stack
- Stacks are NOT persisted (cleared on app restart)
"""
import logging
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from collections import deque

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
    - Built-in undo/redo stacks per composition
    - Persistence handled by CompositionService
    - Playback handled by PlaybackEngineService
    """

    def __init__(self, max_undo_stack_size: int = 50) -> None:
        """Initialize composition state service

        Args:
            max_undo_stack_size: Maximum number of states to keep in undo/redo stacks
        """
        # State storage (in-memory ONLY - persistence handled by CompositionService)
        self.compositions: Dict[str, Composition] = {}  # composition_id -> Composition
        self.current_composition_id: Optional[str] = None  # Active composition

        # Undo/Redo stacks (built-in, per composition)
        self.max_undo_stack_size = max_undo_stack_size
        self.undo_stacks: Dict[str, deque[Composition]] = {}  # composition_id -> undo stack
        self.redo_stacks: Dict[str, deque[Composition]] = {}  # composition_id -> redo stack

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

    def _generate_unique_clip_name(self, composition: Composition, clip_type: str) -> str:
        """
        Generate a unique clip name with sequential numbering.

        Pattern: "MIDI Clip 1", "MIDI Clip 2", "Audio Clip 1", etc.

        Args:
            composition: The composition to check for existing clips
            clip_type: "midi" or "audio"

        Returns:
            Unique clip name with sequential number
        """
        # Count existing clips of this type
        type_prefix = f"{clip_type.upper()} Clip"
        existing_numbers = []

        for clip in composition.clips:
            # Check if clip name matches pattern "MIDI Clip N" or "AUDIO Clip N"
            if clip.name.startswith(type_prefix):
                # Extract number from name
                suffix = clip.name[len(type_prefix):].strip()
                if suffix.isdigit():
                    existing_numbers.append(int(suffix))

        # Find next available number
        next_number = 1
        while next_number in existing_numbers:
            next_number += 1

        return f"{type_prefix} {next_number}"

    def add_clip(self, composition_id: str, request: AddClipRequest) -> Optional[Clip]:
        """Add a clip to a composition"""
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.error(f"❌ Composition {composition_id} not found")
            return None

        # Generate unique clip name if not provided
        clip_name = request.name
        if not clip_name:
            clip_name = self._generate_unique_clip_name(composition, request.clip_type)

        clip_id = str(uuid.uuid4())
        clip = Clip(
            id=clip_id,
            name=clip_name,
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

        logger.info(f"✅ Added {request.clip_type} clip '{clip_name}' to composition {composition_id}")
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

    # ========================================================================
    # UNDO/REDO SYSTEM (BUILT-IN)
    # ========================================================================

    def push_undo(self, composition_id: str) -> None:
        """
        Push current composition state to undo stack (call BEFORE mutation)

        This should be called before ANY undoable mutation.
        It captures the current state and clears the redo stack.

        Args:
            composition_id: Composition ID
        """
        composition = self.compositions.get(composition_id)
        if not composition:
            logger.warning(f"⚠️ Cannot push undo: composition {composition_id} not found")
            return

        # Initialize stacks if needed
        if composition_id not in self.undo_stacks:
            self.undo_stacks[composition_id] = deque(maxlen=self.max_undo_stack_size)
            self.redo_stacks[composition_id] = deque(maxlen=self.max_undo_stack_size)

        # Push deep copy to undo stack
        self.undo_stacks[composition_id].append(composition.model_copy(deep=True))

        # Clear redo stack (new action invalidates redo history)
        self.redo_stacks[composition_id].clear()

        logger.debug(f"📚 Pushed to undo stack for {composition_id} (stack size: {len(self.undo_stacks[composition_id])})")

    def undo(self, composition_id: str) -> Optional[Composition]:
        """
        Undo to previous state

        Pops from undo stack, pushes current state to redo stack, and returns previous state.
        The caller is responsible for restoring this state to all services.

        Args:
            composition_id: Composition ID

        Returns:
            Previous composition state, or None if nothing to undo
        """
        if composition_id not in self.undo_stacks or not self.undo_stacks[composition_id]:
            logger.debug(f"⚠️ Nothing to undo for {composition_id}")
            return None

        current_composition = self.compositions.get(composition_id)
        if not current_composition:
            logger.error(f"❌ Current composition {composition_id} not found")
            return None

        # Pop from undo stack
        previous_state = self.undo_stacks[composition_id].pop()

        # Push current state to redo stack
        self.redo_stacks[composition_id].append(current_composition.model_copy(deep=True))

        # Update in-memory composition
        self.compositions[composition_id] = previous_state.model_copy(deep=True)

        logger.info(f"⏪ Undo for {composition_id} (undo: {len(self.undo_stacks[composition_id])}, redo: {len(self.redo_stacks[composition_id])})")

        return previous_state

    def redo(self, composition_id: str) -> Optional[Composition]:
        """
        Redo to next state

        Pops from redo stack, pushes current state to undo stack, and returns next state.
        The caller is responsible for restoring this state to all services.

        Args:
            composition_id: Composition ID

        Returns:
            Next composition state, or None if nothing to redo
        """
        if composition_id not in self.redo_stacks or not self.redo_stacks[composition_id]:
            logger.debug(f"⚠️ Nothing to redo for {composition_id}")
            return None

        current_composition = self.compositions.get(composition_id)
        if not current_composition:
            logger.error(f"❌ Current composition {composition_id} not found")
            return None

        # Pop from redo stack
        next_state = self.redo_stacks[composition_id].pop()

        # Push current state to undo stack
        self.undo_stacks[composition_id].append(current_composition.model_copy(deep=True))

        # Update in-memory composition
        self.compositions[composition_id] = next_state.model_copy(deep=True)

        logger.info(f"⏩ Redo for {composition_id} (undo: {len(self.undo_stacks[composition_id])}, redo: {len(self.redo_stacks[composition_id])})")

        return next_state

    def can_undo(self, composition_id: str) -> bool:
        """Check if undo is available for a composition"""
        return composition_id in self.undo_stacks and len(self.undo_stacks[composition_id]) > 0

    def can_redo(self, composition_id: str) -> bool:
        """Check if redo is available for a composition"""
        return composition_id in self.redo_stacks and len(self.redo_stacks[composition_id]) > 0

    def clear_undo_redo(self, composition_id: str) -> None:
        """Clear undo/redo stacks for a composition"""
        if composition_id in self.undo_stacks:
            self.undo_stacks[composition_id].clear()
        if composition_id in self.redo_stacks:
            self.redo_stacks[composition_id].clear()
        logger.debug(f"🗑️ Cleared undo/redo stacks for {composition_id}")

    def get_undo_redo_sizes(self, composition_id: str) -> Tuple[int, int]:
        """Get (undo_size, redo_size) for a composition"""
        undo_size = len(self.undo_stacks.get(composition_id, []))
        redo_size = len(self.redo_stacks.get(composition_id, []))
        return (undo_size, redo_size)

