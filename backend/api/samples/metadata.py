"""
Sample Metadata Operations - Duration updates and metadata management

This module handles sample metadata updates.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Form, Depends
from pydantic import BaseModel
from typing import Optional

from backend.core.exceptions import SampleNotFoundError, ServiceError
from .utils import get_metadata_file, load_metadata, save_metadata

logger = logging.getLogger(__name__)

router = APIRouter()


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


# ============================================================================
# METADATA ENDPOINTS
# ============================================================================

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

