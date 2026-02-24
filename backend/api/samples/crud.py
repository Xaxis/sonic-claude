"""
Sample CRUD Operations - Upload, get, update, delete samples

This module handles basic sample lifecycle operations.
"""
import logging
import os
import uuid
import subprocess
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.dependencies import (
    get_composition_state_service,
    get_composition_service,
    get_mixer_service,
    get_track_effects_service
)
from backend.core.exceptions import SampleNotFoundError, SampleInUseError, ServiceError
from backend.services.daw.composition_state_service import CompositionStateService
from backend.services.daw.composition_service import CompositionService
from backend.services.daw.mixer_service import MixerService
from backend.services.daw.effects_service import TrackEffectsService
from .utils import get_samples_dir, get_metadata_file, load_metadata, save_metadata

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# RESPONSE MODELS
# ============================================================================

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


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

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





@router.get("/", response_model=SampleListResponse)
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


@router.patch("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: str,
    name: Optional[str] = None,
    category: Optional[str] = None,
    metadata_file: str = Depends(get_metadata_file),
    composition_state_service: CompositionStateService = Depends(get_composition_state_service),
    composition_service: CompositionService = Depends(get_composition_service),
    mixer_service: MixerService = Depends(get_mixer_service),
    effects_service: TrackEffectsService = Depends(get_track_effects_service)
):
    """Update sample metadata and propagate changes to sequencer tracks"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        # UNDO: Push current state to undo stack BEFORE mutation (for all affected compositions)
        if name is not None:
            for composition in composition_state_service.compositions.values():
                composition_state_service.push_undo(composition.id)

        if name is not None:
            metadata[sample_id]["name"] = name
        if category is not None:
            metadata[sample_id]["category"] = category

        metadata[sample_id]["updated_at"] = datetime.now().isoformat()
        save_metadata(metadata, metadata_file)

        # Propagate sample name changes to all sequencer tracks using this sample
        if name is not None:
            updated_count = composition_state_service.update_sample_references(sample_id, name)
            logger.info(f"📝 Updated sample name in {updated_count} sequencer tracks")

            # AUTO-PERSIST: Sample name changes affect track state in compositions
            # Persist all compositions that might have been affected
            for composition in composition_state_service.compositions.values():
                composition_service.auto_persist_composition(
                    composition_id=composition.id,
                    composition_state_service=composition_state_service,
                    mixer_service=mixer_service,
                    effects_service=effects_service
                )

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
    composition_state_service: CompositionStateService = Depends(get_composition_state_service)
):
    """Delete a sample (only if not in use by sequencer tracks)"""
    try:
        metadata = load_metadata(metadata_file)
        if sample_id not in metadata:
            raise SampleNotFoundError(sample_id)

        # Check if sample is being used in any sequencer tracks
        is_in_use, track_names = composition_state_service.check_sample_in_use(sample_id)
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
