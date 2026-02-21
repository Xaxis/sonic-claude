"""
Unified Composition Service - Single source of truth for ALL composition storage

This service replaces:
- sequence_storage.py (sequences only)
- iteration_service.py (AI iterations only)
- mixer state storage (mixer only)
- effects storage (effects only)

Features:
- Stores COMPLETE compositions (sequence + mixer + effects + samples)
- Handles both manual saves AND AI iterations in ONE system
- Unified versioning/history for ALL changes
- Single, consistent directory structure
- Atomic writes to prevent corruption
"""
import logging
import json
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from backend.models.composition_snapshot import (
    CompositionSnapshot,
    AIIteration,
    IterationHistory,
)
from backend.models.composition import CompositionMetadata
from backend.models.sequence import Sequence
from backend.models.mixer import MixerState
from backend.models.effects import TrackEffectChain

logger = logging.getLogger(__name__)


class CompositionService:
    """
    Unified composition storage - ONE system for ALL composition data

    Directory structure:
    data/
        compositions/
            <composition_id>/
                current.json           # Current complete state
                metadata.json          # Composition metadata
                history/
                    000_original.json  # Original state
                    001_<timestamp>.json  # First save/iteration
                    002_<timestamp>.json  # Second save/iteration
                    ...
                autosave.json          # Autosave backup
        samples/
            <sample_files>
            cache/                     # Sample analysis cache
    """

    def __init__(
        self,
        storage_dir: Path = Path("data/compositions"),
        samples_dir: Path = Path("data/samples")
    ):
        self.storage_dir = storage_dir
        self.samples_dir = samples_dir
        self.cache_dir = samples_dir / "cache"

        # Create directory structure
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.samples_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"✅ CompositionService initialized at {self.storage_dir}")

    def _get_composition_dir(self, composition_id: str) -> Path:
        """Get storage directory for a composition"""
        comp_dir = self.storage_dir / composition_id
        comp_dir.mkdir(exist_ok=True)
        (comp_dir / "history").mkdir(exist_ok=True)
        return comp_dir

    def save_composition(
        self,
        composition_id: str,
        snapshot: CompositionSnapshot,
        create_history: bool = True,
        is_autosave: bool = False
    ) -> None:
        """
        Save complete composition state

        Args:
            composition_id: Composition ID
            snapshot: Complete composition snapshot
            create_history: Whether to create a history entry
            is_autosave: Whether this is an autosave
        """
        comp_dir = self._get_composition_dir(composition_id)

        # Save current state
        if is_autosave:
            target_file = comp_dir / "autosave.json"
        else:
            target_file = comp_dir / "current.json"

        self._atomic_write(target_file, snapshot.model_dump(mode='json'))

        # Create history entry if requested
        if create_history and not is_autosave:
            self._create_history_entry(composition_id, snapshot)

        logger.info(f"💾 Saved composition {composition_id} ({'autosave' if is_autosave else 'manual'})")

    def _create_history_entry(self, composition_id: str, snapshot: CompositionSnapshot) -> None:
        """Create a history entry for this save"""
        comp_dir = self._get_composition_dir(composition_id)
        history_dir = comp_dir / "history"

        # Find next version number
        existing = sorted(history_dir.glob("*.json"))
        next_num = len(existing)

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{next_num:03d}_{timestamp}.json"

        self._atomic_write(history_dir / filename, snapshot.model_dump(mode='json'))
        logger.info(f"📝 Created history entry: {filename}")

    def _atomic_write(self, path: Path, data: Dict[str, Any]) -> None:
        """Write JSON file atomically"""
        temp_path = path.with_suffix('.tmp')
        try:
            with open(temp_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            shutil.move(str(temp_path), str(path))
        except Exception as e:
            if temp_path.exists():
                temp_path.unlink()
            raise e



    def load_composition(self, composition_id: str, use_autosave: bool = False) -> Optional[CompositionSnapshot]:
        """
        Load complete composition state

        Args:
            composition_id: Composition ID
            use_autosave: Load from autosave instead of current

        Returns:
            Complete composition snapshot or None if not found
        """
        comp_dir = self._get_composition_dir(composition_id)

        if use_autosave:
            source_file = comp_dir / "autosave.json"
        else:
            source_file = comp_dir / "current.json"
            # Fall back to autosave if current doesn't exist
            if not source_file.exists():
                autosave_file = comp_dir / "autosave.json"
                if autosave_file.exists():
                    logger.warning(f"⚠️ current.json not found for {composition_id}, falling back to autosave.json")
                    source_file = autosave_file
                else:
                    logger.warning(f"⚠️ Composition {composition_id} not found (no current.json or autosave.json)")
                    return None

        if not source_file.exists():
            logger.warning(f"⚠️ Composition {composition_id} not found at {source_file}")
            return None

        try:
            with open(source_file, 'r') as f:
                data = json.load(f)
            return CompositionSnapshot(**data)
        except Exception as e:
            logger.error(f"❌ Failed to load composition {composition_id}: {e}")
            return None

    def get_history(self, composition_id: str) -> List[Dict[str, Any]]:
        """
        Get history entries for a composition

        Returns:
            List of history metadata (version number, timestamp, summary)
        """
        comp_dir = self._get_composition_dir(composition_id)
        history_dir = comp_dir / "history"

        if not history_dir.exists():
            return []

        history = []
        for entry in sorted(history_dir.glob("*.json")):
            # Parse filename: 001_20260218_143022.json
            parts = entry.stem.split('_', 1)
            version_num = int(parts[0])
            timestamp_str = parts[1] if len(parts) > 1 else "unknown"

            history.append({
                "version": version_num,
                "timestamp": timestamp_str,
                "filename": entry.name,
                "path": str(entry)
            })

        return history

    def load_history_version(self, composition_id: str, version: int) -> Optional[CompositionSnapshot]:
        """
        Load a specific version from history

        Args:
            composition_id: Composition ID
            version: Version number (0 = original, 1 = first save, etc.)

        Returns:
            Complete composition snapshot or None if not found
        """
        comp_dir = self._get_composition_dir(composition_id)
        history_dir = comp_dir / "history"

        # Find the file with this version number
        pattern = f"{version:03d}_*.json"
        matches = list(history_dir.glob(pattern))

        if not matches:
            logger.warning(f"⚠️ Version {version} not found for composition {composition_id}")
            return None

        try:
            with open(matches[0], 'r') as f:
                data = json.load(f)
            return CompositionSnapshot(**data)
        except Exception as e:
            logger.error(f"❌ Failed to load version {version}: {e}")
            return None

    def restore_version(self, composition_id: str, version: int) -> bool:
        """
        Restore a composition to a specific version

        This loads the version and saves it as the current state,
        creating a new history entry.

        Args:
            composition_id: Composition ID
            version: Version number to restore

        Returns:
            True if successful, False otherwise
        """
        snapshot = self.load_history_version(composition_id, version)
        if not snapshot:
            return False

        # Save as current (this creates a new history entry)
        self.save_composition(composition_id, snapshot, create_history=True)
        logger.info(f"♻️ Restored composition {composition_id} to version {version}")
        return True

    def delete_composition(self, composition_id: str) -> bool:
        """
        Delete a composition and all its history

        Args:
            composition_id: Composition ID

        Returns:
            True if successful, False otherwise
        """
        comp_dir = self._get_composition_dir(composition_id)

        if not comp_dir.exists():
            logger.warning(f"⚠️ Composition {composition_id} not found")
            return False

        try:
            shutil.rmtree(comp_dir)
            logger.info(f"🗑️ Deleted composition {composition_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to delete composition {composition_id}: {e}")
            return False

    def list_compositions(self) -> List[CompositionMetadata]:
        """
        List all compositions

        Returns:
            List of CompositionMetadata objects (lightweight info for browsing)
        """
        compositions = []

        for comp_dir in self.storage_dir.iterdir():
            if not comp_dir.is_dir():
                continue

            current_file = comp_dir / "current.json"
            if not current_file.exists():
                continue

            try:
                with open(current_file, 'r') as f:
                    data = json.load(f)

                # Extract sequence data for stats
                sequence_data = data.get("sequence", {})
                tracks = sequence_data.get("tracks", [])

                # Count total clips across all tracks
                clip_count = sum(len(track.get("clips", [])) for track in tracks)

                # Calculate duration (max end position of all clips)
                duration_beats = 0.0
                for track in tracks:
                    for clip in track.get("clips", []):
                        clip_end = clip.get("start_beat", 0) + clip.get("duration_beats", 0)
                        duration_beats = max(duration_beats, clip_end)

                # Check for autosave
                autosave_file = comp_dir / "autosave.json"
                has_autosave = autosave_file.exists()

                # Get file size
                file_size_bytes = current_file.stat().st_size if current_file.exists() else None

                # Parse timestamps
                created_at = data.get("created_at")
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                elif not isinstance(created_at, datetime):
                    created_at = datetime.now()

                updated_at = data.get("metadata", {}).get("updated_at")
                if isinstance(updated_at, str):
                    updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                elif not isinstance(updated_at, datetime):
                    updated_at = created_at

                compositions.append(CompositionMetadata(
                    id=comp_dir.name,
                    name=data.get("name", "Untitled"),
                    tempo=sequence_data.get("tempo", 120.0),
                    time_signature=sequence_data.get("time_signature", "4/4"),
                    created_at=created_at,
                    updated_at=updated_at,
                    track_count=len(tracks),
                    clip_count=clip_count,
                    duration_beats=duration_beats,
                    file_size_bytes=file_size_bytes,
                    has_autosave=has_autosave
                ))
            except Exception as e:
                logger.error(f"❌ Failed to read composition {comp_dir.name}: {e}")

        # Sort by updated_at (most recent first)
        return sorted(compositions, key=lambda x: x.updated_at, reverse=True)

    # ========================================================================
    # SNAPSHOT BUILDING HELPERS
    # ========================================================================

    def build_snapshot_from_services(
        self,
        sequencer_service: 'SequencerService',
        mixer_service: 'MixerService',
        effects_service: 'TrackEffectsService',
        sequence_id: str,
        name: str = "Snapshot",
        metadata: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, Any]]] = None
    ) -> Optional[CompositionSnapshot]:
        """
        Build a complete composition snapshot from current service states

        Args:
            sequencer_service: SequencerService instance
            mixer_service: MixerService instance
            effects_service: TrackEffectsService instance
            sequence_id: ID of the sequence to snapshot
            name: Name for the snapshot
            metadata: Additional metadata
            chat_history: Chat conversation history

        Returns:
            Complete composition snapshot or None if sequence not found
        """
        # Get sequence
        sequence = sequencer_service.get_sequence(sequence_id)
        if not sequence:
            logger.error(f"❌ Sequence {sequence_id} not found")
            return None

        # Get mixer state
        mixer_state = mixer_service.state

        # Get all track effects
        track_effects = []
        for track in sequence.tracks:
            effect_chain = effects_service.get_track_effect_chain(track.id)
            if effect_chain and effect_chain.effects:  # Only include if there are effects
                track_effects.append(effect_chain)

        # Get sample assignments (from sample tracks)
        sample_assignments = {}
        for track in sequence.tracks:
            if track.type == "sample" and hasattr(track, 'sample_path') and track.sample_path:
                sample_assignments[track.id] = track.sample_path

        # Build snapshot
        snapshot = CompositionSnapshot(
            id=str(uuid.uuid4()),
            name=name,
            created_at=datetime.now(),
            sequence=sequence,
            mixer_state=mixer_state,
            track_effects=track_effects,
            sample_assignments=sample_assignments,
            chat_history=chat_history or [],
            metadata=metadata or {}
        )

        return snapshot

    def restore_snapshot_to_services(
        self,
        snapshot: CompositionSnapshot,
        sequencer_service: 'SequencerService',
        mixer_service: 'MixerService',
        effects_service: 'TrackEffectsService',
        set_as_current: bool = True
    ) -> bool:
        """
        Restore a composition snapshot to the services

        This updates all services to match the snapshot state.

        Args:
            snapshot: Composition snapshot to restore
            sequencer_service: SequencerService instance
            mixer_service: MixerService instance
            effects_service: TrackEffectsService instance
            set_as_current: Whether to set this sequence as the current sequence (default: True)

        Returns:
            True if successful, False otherwise
        """
        try:
            # Restore sequence
            sequence = snapshot.sequence
            sequencer_service.sequences[sequence.id] = sequence

            # Set as current sequence (only if requested)
            if set_as_current:
                sequencer_service.current_sequence_id = sequence.id
                # Restore mixer state (only for current sequence)
                mixer_service.state = snapshot.mixer_state

            # Restore effects
            for effect_chain in snapshot.track_effects:
                effects_service.track_effects[effect_chain.track_id] = effect_chain

            # Restore sample assignments
            for track_id, sample_path in snapshot.sample_assignments.items():
                # Find track in sequence
                track = next((t for t in sequence.tracks if t.id == track_id), None)
                if track and hasattr(track, 'sample_path'):
                    track.sample_path = sample_path

            logger.info(f"✅ Restored composition snapshot: {snapshot.name} (set_as_current={set_as_current})")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to restore snapshot: {e}")
            return False

