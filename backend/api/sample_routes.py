"""
Sample Library Routes - REST API for sample storage and management

Provides endpoints for uploading, retrieving, and managing audio samples
"""
import logging
import os
import json
import uuid
import subprocess
from datetime import datetime
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.dependencies import get_settings, get_sequencer_service
from backend.core.config import Settings
from backend.core.exceptions import SampleNotFoundError, SampleInUseError, ServiceError
from backend.services.sequencer_service import SequencerService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_samples_dir(settings: Settings = Depends(get_settings)) -> str:
    """Get samples directory from settings and ensure it exists"""
    samples_dir = settings.storage.samples_dir
    os.makedirs(samples_dir, exist_ok=True)
    return samples_dir


def get_metadata_file(settings: Settings = Depends(get_settings)) -> str:
    """Get metadata file path from settings"""
    return os.path.join(settings.storage.samples_dir, "metadata.json")


class SampleMetadata(BaseModel):
    """Sample metadata model"""
    id: str
    name: str
    category: str
    duration: float
    size: int
    file_name: str
    created_at: str
    updated_at: str


class SampleResponse(BaseModel):
    """Response model for single sample operations"""
    success: bool
    message: str
    sample: Optional[SampleMetadata] = None


class SampleListResponse(BaseModel):
    """Response model for list operations"""
    success: bool
    samples: List[SampleMetadata]
    total: int


def load_metadata(metadata_file: str) -> dict:
    """Load sample metadata from JSON file"""
    if not os.path.exists(metadata_file):
        return {}
    try:
        with open(metadata_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load metadata: {e}")
        return {}


def save_metadata(metadata: dict, metadata_file: str):
    """Save sample metadata to JSON file"""
    try:
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save metadata: {e}")
        raise


@router.post("/upload", response_model=SampleResponse)
async def upload_sample(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("Uncategorized"),
    samples_dir: str = Depends(get_samples_dir),
    metadata_file: str = Depends(get_metadata_file)
):
    """Upload a new audio sample - converts WebM to WAV for SuperCollider compatibility"""
    try:
        # Generate unique ID
        sample_id = str(uuid.uuid4())

        # Get file extension
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ".webm"

        # Save uploaded file temporarily
        temp_file_name = f"{sample_id}_temp{file_ext}"
        temp_file_path = os.path.join(samples_dir, temp_file_name)

        content = await file.read()
        with open(temp_file_path, 'wb') as f:
            f.write(content)

        # Convert to WAV if needed (SuperCollider only supports WAV, AIFF, FLAC)
        if file_ext.lower() in ['.webm', '.mp3', '.m4a', '.aac']:
            logger.info(f"🔄 Converting {file_ext} to WAV for SuperCollider compatibility...")
            final_file_name = f"{sample_id}.wav"
            final_file_path = os.path.join(samples_dir, final_file_name)

            try:
                # Use ffmpeg to convert to WAV
                subprocess.run([
                    'ffmpeg', '-i', temp_file_path,
                    '-acodec', 'pcm_s16le',  # 16-bit PCM
                    '-ar', '48000',  # 48kHz sample rate
                    '-ac', '2',  # Stereo
                    '-y',  # Overwrite output file
                    final_file_path
                ], check=True, capture_output=True)

                # Remove temp file
                os.remove(temp_file_path)
                logger.info(f"✅ Converted to WAV: {final_file_name}")

            except subprocess.CalledProcessError as e:
                logger.error(f"❌ FFmpeg conversion failed: {e.stderr.decode()}")
                # Fallback: keep original file
                final_file_name = temp_file_name
                final_file_path = temp_file_path

        else:
            # Already in supported format
            final_file_name = f"{sample_id}{file_ext}"
            final_file_path = temp_file_path
            os.rename(temp_file_path, final_file_path)

        # Get file size
        file_size = os.path.getsize(final_file_path)

        # Create metadata
        now = datetime.now().isoformat()
        metadata = SampleMetadata(
            id=sample_id,
            name=name,
            category=category,
            duration=0.0,  # Will be updated later
            size=file_size,
            file_name=final_file_name,
            created_at=now,
            updated_at=now
        )

        # Load existing metadata
        all_metadata = load_metadata(metadata_file)
        all_metadata[sample_id] = metadata.dict()
        save_metadata(all_metadata, metadata_file)

        logger.info(f"✅ Uploaded sample: {name} ({final_file_name})")

        return SampleResponse(
            success=True,
            message="Sample uploaded successfully",
            sample=metadata
        )
    except Exception as e:
        logger.error(f"❌ Failed to upload sample: {e}")
        raise ServiceError(f"Failed to upload sample: {str(e)}")


@router.get("", response_model=SampleListResponse)
async def get_all_samples(
    metadata_file: str = Depends(get_metadata_file)
):
    """Get all samples"""
    try:
        metadata = load_metadata(metadata_file)
        samples = [SampleMetadata(**data) for data in metadata.values()]
        return SampleListResponse(
            success=True,
            samples=samples,
            total=len(samples)
        )
    except Exception as e:
        logger.error(f"❌ Failed to get samples: {e}")
        raise ServiceError(f"Failed to get samples: {str(e)}")


@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(
    sample_id: str,
    metadata_file: str = Depends(get_metadata_file)
):
    """Get a single sample by ID"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        return SampleResponse(
            success=True,
            message="Sample retrieved",
            sample=SampleMetadata(**metadata[sample_id])
        )
    except Exception as e:
        logger.error(f"❌ Failed to get sample: {e}")
        raise ServiceError(f"Failed to get sample: {str(e)}")


@router.get("/{sample_id}/download")
async def download_sample(
    sample_id: str,
    samples_dir: str = Depends(get_samples_dir),
    metadata_file: str = Depends(get_metadata_file)
):
    """Download sample file"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        sample_data = metadata[sample_id]
        file_path = os.path.join(samples_dir, sample_data["file_name"])

        if not os.path.exists(file_path):
            raise SampleNotFoundError(sample_id)

        return FileResponse(
            file_path,
            media_type="audio/webm",
            filename=sample_data["file_name"]
        )
    except Exception as e:
        logger.error(f"❌ Failed to download sample: {e}")
        raise ServiceError(f"Failed to download sample: {str(e)}")


@router.post("/{sample_id}/duration", response_model=SampleResponse)
async def update_sample_duration(
    sample_id: str,
    duration: float = Form(...),
    metadata_file: str = Depends(get_metadata_file)
):
    """Update sample duration"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        metadata[sample_id]["duration"] = duration
        metadata[sample_id]["updated_at"] = datetime.now().isoformat()
        save_metadata(metadata, metadata_file)

        return SampleResponse(
            success=True,
            message="Duration updated",
            sample=SampleMetadata(**metadata[sample_id])
        )
    except Exception as e:
        logger.error(f"❌ Failed to update duration: {e}")
        raise ServiceError(f"Failed to update duration: {str(e)}")


@router.patch("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: str,
    name: Optional[str] = None,
    category: Optional[str] = None,
    metadata_file: str = Depends(get_metadata_file),
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Update sample metadata and propagate changes to sequencer tracks"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        if name is not None:
            metadata[sample_id]["name"] = name
        if category is not None:
            metadata[sample_id]["category"] = category

        metadata[sample_id]["updated_at"] = datetime.now().isoformat()
        save_metadata(metadata, metadata_file)

        # Propagate sample name changes to all sequencer tracks using this sample
        if name is not None:
            updated_count = sequencer_service.update_sample_references(sample_id, name)
            logger.info(f"📝 Updated sample name in {updated_count} sequencer tracks")

        return SampleResponse(
            success=True,
            message="Sample updated",
            sample=SampleMetadata(**metadata[sample_id])
        )
    except Exception as e:
        logger.error(f"❌ Failed to update sample: {e}")
        raise ServiceError(f"Failed to update sample: {str(e)}")


@router.delete("/{sample_id}")
async def delete_sample(
    sample_id: str,
    samples_dir: str = Depends(get_samples_dir),
    metadata_file: str = Depends(get_metadata_file),
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Delete a sample (only if not in use by sequencer tracks)"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        # Check if sample is being used in any sequencer tracks
        is_in_use, track_names = sequencer_service.check_sample_in_use(sample_id)
        if is_in_use:
            raise SampleInUseError(sample_id, len(track_names), track_names)

        # Delete file
        sample_data = metadata[sample_id]
        file_path = os.path.join(samples_dir, sample_data["file_name"])
        if os.path.exists(file_path):
            os.remove(file_path)

        # Remove from metadata
        del metadata[sample_id]
        save_metadata(metadata, metadata_file)

        logger.info(f"✅ Deleted sample: {sample_id}")

        return {"success": True, "message": "Sample deleted"}
    except Exception as e:
        logger.error(f"❌ Failed to delete sample: {e}")
        raise ServiceError(f"Failed to delete sample: {str(e)}")

