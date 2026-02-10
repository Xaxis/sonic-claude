"""
Sample storage service
Handles audio sample file storage and metadata management
"""
import os
import json
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime
from fastapi import UploadFile
import uuid

from backend.core.logging import get_logger
from backend.models.sample import SampleMetadata

logger = get_logger(__name__)


class SampleService:
    """Service for managing audio sample storage"""

    def __init__(self, storage_dir: str = "data/samples"):
        """Initialize sample service

        Args:
            storage_dir: Directory to store sample files and metadata
        """
        self.storage_dir = Path(storage_dir)
        self.files_dir = self.storage_dir / "files"
        self.metadata_file = self.storage_dir / "metadata.json"

        # Create directories if they don't exist
        self.files_dir.mkdir(parents=True, exist_ok=True)

        # Load or initialize metadata
        self.metadata: dict[str, SampleMetadata] = {}
        self._load_metadata()

        logger.info(f"Sample service initialized with storage at {self.storage_dir}")

    def _load_metadata(self):
        """Load sample metadata from disk"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)
                    self.metadata = {
                        sample_id: SampleMetadata(**sample_data)
                        for sample_id, sample_data in data.items()
                    }
                logger.info(f"Loaded {len(self.metadata)} samples from metadata")
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")
                self.metadata = {}
        else:
            logger.info("No existing metadata found, starting fresh")

    def _save_metadata(self):
        """Save sample metadata to disk"""
        try:
            data = {
                sample_id: sample.model_dump(mode='json')
                for sample_id, sample in self.metadata.items()
            }
            with open(self.metadata_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            logger.debug("Metadata saved successfully")
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
            raise

    async def create_sample(self, file: UploadFile, name: str, category: str = "Uncategorized") -> SampleMetadata:
        """Create a new sample from uploaded file

        Args:
            file: Uploaded audio file
            name: Sample name
            category: Sample category

        Returns:
            SampleMetadata for the created sample
        """
        # Generate unique ID
        sample_id = str(uuid.uuid4())

        # Get file extension
        file_ext = Path(file.filename or "audio.webm").suffix
        file_name = f"{sample_id}{file_ext}"
        file_path = self.files_dir / file_name

        # Save file to disk
        try:
            with open(file_path, 'wb') as f:
                content = await file.read()
                f.write(content)

            file_size = len(content)
            logger.info(f"Saved sample file: {file_name} ({file_size} bytes)")
        except Exception as e:
            logger.error(f"Failed to save sample file: {e}")
            raise

        # Create metadata
        now = datetime.now()
        metadata = SampleMetadata(
            id=sample_id,
            name=name,
            category=category,
            duration=0.0,  # Will be updated by frontend after decoding
            size=file_size,
            file_name=file_name,
            created_at=now,
            updated_at=now
        )

        # Store metadata
        self.metadata[sample_id] = metadata
        self._save_metadata()

        logger.info(f"Created sample: {sample_id} - {name}")
        return metadata

    def get_sample(self, sample_id: str) -> Optional[SampleMetadata]:
        """Get sample metadata by ID"""
        return self.metadata.get(sample_id)

    def get_all_samples(self) -> list[SampleMetadata]:
        """Get all sample metadata"""
        return list(self.metadata.values())

    def get_sample_file_path(self, sample_id: str) -> Optional[Path]:
        """Get file path for a sample"""
        metadata = self.metadata.get(sample_id)
        if metadata:
            return self.files_dir / metadata.file_name
        return None



    def update_sample(self, sample_id: str, name: Optional[str] = None,
                     category: Optional[str] = None, duration: Optional[float] = None) -> Optional[SampleMetadata]:
        """Update sample metadata

        Args:
            sample_id: Sample ID
            name: New name (optional)
            category: New category (optional)
            duration: New duration (optional)

        Returns:
            Updated SampleMetadata or None if not found
        """
        metadata = self.metadata.get(sample_id)
        if not metadata:
            return None

        # Update fields
        if name is not None:
            metadata.name = name
        if category is not None:
            metadata.category = category
        if duration is not None:
            metadata.duration = duration

        metadata.updated_at = datetime.now()

        # Save metadata
        self._save_metadata()

        logger.info(f"Updated sample: {sample_id}")
        return metadata

    def delete_sample(self, sample_id: str) -> bool:
        """Delete a sample and its file

        Args:
            sample_id: Sample ID

        Returns:
            True if deleted, False if not found
        """
        metadata = self.metadata.get(sample_id)
        if not metadata:
            return False

        # Delete file
        file_path = self.files_dir / metadata.file_name
        try:
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Deleted sample file: {metadata.file_name}")
        except Exception as e:
            logger.error(f"Failed to delete sample file: {e}")

        # Remove from metadata
        del self.metadata[sample_id]
        self._save_metadata()

        logger.info(f"Deleted sample: {sample_id}")
        return True
