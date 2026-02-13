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
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

# Sample storage directory
SAMPLES_DIR = "data/samples"
METADATA_FILE = os.path.join(SAMPLES_DIR, "metadata.json")

# Ensure samples directory exists
os.makedirs(SAMPLES_DIR, exist_ok=True)


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


def load_metadata() -> dict:
    """Load sample metadata from JSON file"""
    if not os.path.exists(METADATA_FILE):
        return {}
    try:
        with open(METADATA_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load metadata: {e}")
        return {}


def save_metadata(metadata: dict):
    """Save sample metadata to JSON file"""
    try:
        with open(METADATA_FILE, 'w') as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save metadata: {e}")
        raise


@router.post("/upload", response_model=SampleResponse)
async def upload_sample(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("Uncategorized")
):
    """Upload a new audio sample - converts WebM to WAV for SuperCollider compatibility"""
    try:
        # Generate unique ID
        sample_id = str(uuid.uuid4())

        # Get file extension
        file_ext = os.path.splitext(file.filename)[1] if file.filename else ".webm"

        # Save uploaded file temporarily
        temp_file_name = f"{sample_id}_temp{file_ext}"
        temp_file_path = os.path.join(SAMPLES_DIR, temp_file_name)

        content = await file.read()
        with open(temp_file_path, 'wb') as f:
            f.write(content)

        # Convert to WAV if needed (SuperCollider only supports WAV, AIFF, FLAC)
        if file_ext.lower() in ['.webm', '.mp3', '.m4a', '.aac']:
            logger.info(f"🔄 Converting {file_ext} to WAV for SuperCollider compatibility...")
            final_file_name = f"{sample_id}.wav"
            final_file_path = os.path.join(SAMPLES_DIR, final_file_name)

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
        all_metadata = load_metadata()
        all_metadata[sample_id] = metadata.dict()
        save_metadata(all_metadata)

        logger.info(f"✅ Uploaded sample: {name} ({final_file_name})")

        return SampleResponse(
            success=True,
            message="Sample uploaded successfully",
            sample=metadata
        )
    except Exception as e:
        logger.error(f"❌ Failed to upload sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=SampleListResponse)
async def get_all_samples():
    """Get all samples"""
    try:
        metadata = load_metadata()
        samples = [SampleMetadata(**data) for data in metadata.values()]
        return SampleListResponse(
            success=True,
            samples=samples,
            total=len(samples)
        )
    except Exception as e:
        logger.error(f"❌ Failed to get samples: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(sample_id: str):
    """Get a single sample by ID"""
    try:
        metadata = load_metadata()
        if sample_id not in metadata:
            raise HTTPException(status_code=404, detail="Sample not found")

        return SampleResponse(
            success=True,
            message="Sample retrieved",
            sample=SampleMetadata(**metadata[sample_id])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sample_id}/download")
async def download_sample(sample_id: str):
    """Download sample file"""
    try:
        metadata = load_metadata()
        if sample_id not in metadata:
            raise HTTPException(status_code=404, detail="Sample not found")

        sample_data = metadata[sample_id]
        file_path = os.path.join(SAMPLES_DIR, sample_data["file_name"])

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Sample file not found")

        return FileResponse(
            file_path,
            media_type="audio/webm",
            filename=sample_data["file_name"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to download sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sample_id}/duration", response_model=SampleResponse)
async def update_sample_duration(sample_id: str, duration: float = Form(...)):
    """Update sample duration"""
    try:
        metadata = load_metadata()
        if sample_id not in metadata:
            raise HTTPException(status_code=404, detail="Sample not found")

        metadata[sample_id]["duration"] = duration
        metadata[sample_id]["updated_at"] = datetime.now().isoformat()
        save_metadata(metadata)

        return SampleResponse(
            success=True,
            message="Duration updated",
            sample=SampleMetadata(**metadata[sample_id])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update duration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{sample_id}", response_model=SampleResponse)
async def update_sample(sample_id: str, name: Optional[str] = None, category: Optional[str] = None):
    """Update sample metadata and propagate changes to sequencer tracks"""
    try:
        metadata = load_metadata()
        if sample_id not in metadata:
            raise HTTPException(status_code=404, detail="Sample not found")

        if name is not None:
            metadata[sample_id]["name"] = name
        if category is not None:
            metadata[sample_id]["category"] = category

        metadata[sample_id]["updated_at"] = datetime.now().isoformat()
        save_metadata(metadata)

        # Propagate sample name changes to all sequencer tracks using this sample
        if name is not None:
            from backend.api.sequencer_routes import sequencer_service
            if sequencer_service:
                updated_count = sequencer_service.update_sample_references(sample_id, name)
                logger.info(f"📝 Updated sample name in {updated_count} sequencer tracks")

        return SampleResponse(
            success=True,
            message="Sample updated",
            sample=SampleMetadata(**metadata[sample_id])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{sample_id}")
async def delete_sample(sample_id: str):
    """Delete a sample (only if not in use by sequencer tracks)"""
    try:
        metadata = load_metadata()
        if sample_id not in metadata:
            raise HTTPException(status_code=404, detail="Sample not found")

        # Check if sample is being used in any sequencer tracks
        from backend.api.sequencer_routes import sequencer_service
        if sequencer_service:
            is_in_use, track_names = sequencer_service.check_sample_in_use(sample_id)
            if is_in_use:
                tracks_list = ", ".join(track_names[:3])  # Show first 3 tracks
                if len(track_names) > 3:
                    tracks_list += f" and {len(track_names) - 3} more"
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot delete sample: it is being used in {len(track_names)} track(s): {tracks_list}"
                )

        # Delete file
        sample_data = metadata[sample_id]
        file_path = os.path.join(SAMPLES_DIR, sample_data["file_name"])
        if os.path.exists(file_path):
            os.remove(file_path)

        # Remove from metadata
        del metadata[sample_id]
        save_metadata(metadata)

        logger.info(f"✅ Deleted sample: {sample_id}")

        return {"success": True, "message": "Sample deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))

