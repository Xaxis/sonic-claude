"""
Sequence Storage Service - Persistent storage for sequences with autosave and versioning

Features:
- JSON-based storage for human-readable, version-controllable files
- Autosave with configurable intervals
- Version history with rollback capability
- Atomic writes to prevent corruption
- Backup/recovery system
"""
import logging
import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path

from backend.models.sequence import Sequence

logger = logging.getLogger(__name__)


class SequenceStorage:
    """
    Manages persistent storage of sequences

    Directory structure:
    data/sequences/
        sequences.json          # Main sequence index
        <sequence_id>/
            sequence.json       # Current sequence data
            .autosave.json      # Autosave backup
            versions/           # Version history
                v001_<timestamp>.json
                v002_<timestamp>.json
                ...
    """

    def __init__(self, storage_dir: str = "data/sequences"):
        self.storage_dir = Path(storage_dir)
        self.index_file = self.storage_dir / "sequences.json"

        # Create directory structure
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Initialize index if it doesn't exist
        if not self.index_file.exists():
            self._save_index({})

        logger.info(f"✅ SequenceStorage initialized at {self.storage_dir}")

    # ========================================================================
    # INDEX MANAGEMENT
    # ========================================================================

    def _load_index(self) -> Dict:
        """Load sequence index"""
        try:
            with open(self.index_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            return {}

    def _save_index(self, index: Dict):
        """Save sequence index atomically"""
        try:
            # Write to temp file first
            temp_file = self.index_file.with_suffix('.tmp')
            with open(temp_file, 'w') as f:
                json.dump(index, f, indent=2)

            # Atomic rename
            temp_file.replace(self.index_file)
        except Exception as e:
            logger.error(f"Failed to save index: {e}")
            raise

    # ========================================================================
    # SEQUENCE CRUD
    # ========================================================================

    def save_sequence(self, sequence: Sequence, create_version: bool = False) -> bool:
        """
        Save sequence to disk

        Args:
            sequence: Sequence to save
            create_version: Whether to create a version snapshot

        Returns:
            True if successful
        """
        try:
            sequence_dir = self.storage_dir / sequence.id
            sequence_dir.mkdir(exist_ok=True)

            sequence_file = sequence_dir / "sequence.json"

            # Update timestamp
            sequence.updated_at = datetime.now()

            # Convert to dict
            data = sequence.model_dump(mode='json')

            # Create version if requested
            if create_version:
                self._create_version(sequence.id, data)

            # Save to temp file first (atomic write)
            temp_file = sequence_file.with_suffix('.tmp')
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2)

            # Atomic rename
            temp_file.replace(sequence_file)

            # Update index
            index = self._load_index()
            index[sequence.id] = {
                "id": sequence.id,
                "name": sequence.name,
                "created_at": sequence.created_at.isoformat(),
                "updated_at": sequence.updated_at.isoformat(),
                "file_path": str(sequence_file.relative_to(self.storage_dir))
            }
            self._save_index(index)

            logger.info(f"✅ Saved sequence: {sequence.name} (ID: {sequence.id})")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to save sequence {sequence.id}: {e}")
            return False



    def load_sequence(self, sequence_id: str) -> Optional[Sequence]:
        """Load sequence from disk"""
        try:
            sequence_file = self.storage_dir / sequence_id / "sequence.json"

            if not sequence_file.exists():
                logger.warning(f"Sequence file not found: {sequence_id}")
                return None

            with open(sequence_file, 'r') as f:
                data = json.load(f)

            sequence = Sequence(**data)
            logger.info(f"✅ Loaded sequence: {sequence.name} (ID: {sequence_id})")
            return sequence

        except Exception as e:
            logger.error(f"❌ Failed to load sequence {sequence_id}: {e}")
            return None

    def load_all_sequences(self) -> List[Sequence]:
        """Load all sequences from disk"""
        sequences = []
        index = self._load_index()

        for sequence_id in index.keys():
            sequence = self.load_sequence(sequence_id)
            if sequence:
                sequences.append(sequence)

        logger.info(f"✅ Loaded {len(sequences)} sequences")
        return sequences

    def delete_sequence(self, sequence_id: str) -> bool:
        """Delete sequence from disk"""
        try:
            sequence_dir = self.storage_dir / sequence_id

            if sequence_dir.exists():
                shutil.rmtree(sequence_dir)

            # Update index
            index = self._load_index()
            if sequence_id in index:
                del index[sequence_id]
                self._save_index(index)

            logger.info(f"✅ Deleted sequence: {sequence_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to delete sequence {sequence_id}: {e}")
            return False

    # ========================================================================
    # AUTOSAVE
    # ========================================================================

    def autosave_sequence(self, sequence: Sequence) -> bool:
        """
        Save sequence to autosave file (non-destructive backup)

        This creates a separate .autosave.json file that can be recovered
        if the main file becomes corrupted or the app crashes.
        """
        try:
            sequence_dir = self.storage_dir / sequence.id
            sequence_dir.mkdir(exist_ok=True)

            autosave_file = sequence_dir / ".autosave.json"

            # Update timestamp
            sequence.updated_at = datetime.now()

            # Convert to dict
            data = sequence.model_dump(mode='json')

            # Save to temp file first (atomic write)
            temp_file = autosave_file.with_suffix('.tmp')
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2)

            # Atomic rename
            temp_file.replace(autosave_file)

            logger.debug(f"💾 Autosaved sequence: {sequence.name}")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to autosave sequence {sequence.id}: {e}")
            return False

    def recover_from_autosave(self, sequence_id: str) -> Optional[Sequence]:
        """Recover sequence from autosave file"""
        try:
            autosave_file = self.storage_dir / sequence_id / ".autosave.json"

            if not autosave_file.exists():
                logger.warning(f"No autosave found for sequence: {sequence_id}")
                return None

            with open(autosave_file, 'r') as f:
                data = json.load(f)

            sequence = Sequence(**data)
            logger.info(f"✅ Recovered sequence from autosave: {sequence.name}")
            return sequence

        except Exception as e:
            logger.error(f"❌ Failed to recover autosave for {sequence_id}: {e}")
            return None

    # ========================================================================
    # VERSION HISTORY
    # ========================================================================

    def _create_version(self, sequence_id: str, data: Dict):
        """Create a version snapshot"""
        try:
            versions_dir = self.storage_dir / sequence_id / "versions"
            versions_dir.mkdir(exist_ok=True)

            # Count existing versions
            existing_versions = list(versions_dir.glob("v*.json"))
            version_num = len(existing_versions) + 1

            # Create version file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            version_file = versions_dir / f"v{version_num:03d}_{timestamp}.json"

            with open(version_file, 'w') as f:
                json.dump(data, f, indent=2)

            logger.info(f"📸 Created version {version_num} for sequence {sequence_id}")

            # Keep only last 10 versions
            self._cleanup_old_versions(versions_dir, keep=10)

        except Exception as e:
            logger.error(f"❌ Failed to create version: {e}")

    def _cleanup_old_versions(self, versions_dir: Path, keep: int = 10):
        """Remove old versions, keeping only the most recent N"""
        try:
            versions = sorted(versions_dir.glob("v*.json"))

            if len(versions) > keep:
                for old_version in versions[:-keep]:
                    old_version.unlink()
                    logger.debug(f"🗑️  Removed old version: {old_version.name}")

        except Exception as e:
            logger.error(f"❌ Failed to cleanup versions: {e}")

    def list_versions(self, sequence_id: str) -> List[Dict]:
        """List all versions for a sequence"""
        try:
            versions_dir = self.storage_dir / sequence_id / "versions"

            if not versions_dir.exists():
                return []

            versions = []
            for version_file in sorted(versions_dir.glob("v*.json")):
                # Parse filename: v001_20260211_143022.json
                parts = version_file.stem.split('_')
                version_num = int(parts[0][1:])  # Remove 'v' prefix
                timestamp_str = f"{parts[1]}_{parts[2]}"
                timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")

                versions.append({
                    "version": version_num,
                    "timestamp": timestamp.isoformat(),
                    "file_path": str(version_file)
                })

            return versions

        except Exception as e:
            logger.error(f"❌ Failed to list versions: {e}")
            return []

    def load_version(self, sequence_id: str, version_num: int) -> Optional[Sequence]:
        """Load a specific version of a sequence"""
        try:
            versions_dir = self.storage_dir / sequence_id / "versions"
            version_files = list(versions_dir.glob(f"v{version_num:03d}_*.json"))

            if not version_files:
                logger.warning(f"Version {version_num} not found for sequence {sequence_id}")
                return None

            with open(version_files[0], 'r') as f:
                data = json.load(f)

            sequence = Sequence(**data)
            logger.info(f"✅ Loaded version {version_num} of sequence: {sequence.name}")
            return sequence

        except Exception as e:
            logger.error(f"❌ Failed to load version {version_num}: {e}")
            return None
