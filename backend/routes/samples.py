"""
Sample library API routes
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import Optional

from backend.core.logging import get_logger
from backend.core.dependencies import get_container, ServiceContainer
from backend.models.sample import (
    SampleMetadata,
    SampleUpdate,
    SampleResponse,
    SampleListResponse
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/samples", tags=["samples"])


@router.post("/upload", response_model=SampleResponse)
async def upload_sample(
    file: UploadFile = File(...),
    name: str = Form(...),
    category: str = Form("Uncategorized"),
    container: ServiceContainer = Depends(get_container)
):
    """Upload a new audio sample

    Args:
        file: Audio file to upload
        name: Sample name
        category: Sample category

    Returns:
        SampleResponse with created sample metadata
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")

        # Create sample
        metadata = await container.sample_service.create_sample(file, name, category)

        return SampleResponse(
            success=True,
            message="Sample uploaded successfully",
            sample=metadata
        )
    except Exception as e:
        logger.error(f"Failed to upload sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=SampleListResponse)
async def list_samples(container: ServiceContainer = Depends(get_container)):
    """Get all samples

    Returns:
        SampleListResponse with all samples
    """
    try:
        samples = container.sample_service.get_all_samples()
        return SampleListResponse(
            success=True,
            samples=samples,
            total=len(samples)
        )
    except Exception as e:
        logger.error(f"Failed to list samples: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(
    sample_id: str,
    container: ServiceContainer = Depends(get_container)
):
    """Get sample metadata by ID

    Args:
        sample_id: Sample ID

    Returns:
        SampleResponse with sample metadata
    """
    metadata = container.sample_service.get_sample(sample_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Sample not found")

    return SampleResponse(
        success=True,
        message="Sample found",
        sample=metadata
    )


@router.get("/{sample_id}/download")
async def download_sample(
    sample_id: str,
    container: ServiceContainer = Depends(get_container)
):
    """Download sample audio file

    Args:
        sample_id: Sample ID

    Returns:
        Audio file
    """
    file_path = container.sample_service.get_sample_file_path(sample_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Sample file not found")

    metadata = container.sample_service.get_sample(sample_id)
    return FileResponse(
        path=file_path,
        media_type="audio/webm",
        filename=f"{metadata.name}{file_path.suffix}" if metadata else file_path.name
    )


@router.patch("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: str,
    update: SampleUpdate,
    container: ServiceContainer = Depends(get_container)
):
    """Update sample metadata

    Args:
        sample_id: Sample ID
        update: Fields to update

    Returns:
        SampleResponse with updated metadata
    """
    metadata = container.sample_service.update_sample(
        sample_id,
        name=update.name,
        category=update.category
    )

    if not metadata:
        raise HTTPException(status_code=404, detail="Sample not found")

    return SampleResponse(
        success=True,
        message="Sample updated successfully",
        sample=metadata
    )


@router.delete("/{sample_id}", response_model=SampleResponse)
async def delete_sample(
    sample_id: str,
    container: ServiceContainer = Depends(get_container)
):
    """Delete a sample

    Args:
        sample_id: Sample ID

    Returns:
        SampleResponse confirming deletion
    """
    success = container.sample_service.delete_sample(sample_id)

    if not success:
        raise HTTPException(status_code=404, detail="Sample not found")

    return SampleResponse(
        success=True,
        message="Sample deleted successfully",
        sample=None
    )


@router.post("/{sample_id}/duration")
async def update_sample_duration(
    sample_id: str,
    duration: float = Form(...),
    container: ServiceContainer = Depends(get_container)
):
    """Update sample duration (called by frontend after decoding audio)

    Args:
        sample_id: Sample ID
        duration: Duration in seconds

    Returns:
        SampleResponse with updated metadata
    """
    metadata = container.sample_service.update_sample(sample_id, duration=duration)

    if not metadata:
        raise HTTPException(status_code=404, detail="Sample not found")

    return SampleResponse(
        success=True,
        message="Duration updated successfully",
        sample=metadata
    )

