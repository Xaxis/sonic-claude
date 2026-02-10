"""
Sample model for audio sample library
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SampleMetadata(BaseModel):
    """Metadata for an audio sample"""
    id: str
    name: str
    category: str = "Uncategorized"
    duration: float = 0.0  # in seconds
    size: int = 0  # in bytes
    file_name: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class SampleCreate(BaseModel):
    """Request model for creating a sample"""
    name: str
    category: str = "Uncategorized"


class SampleUpdate(BaseModel):
    """Request model for updating a sample"""
    name: Optional[str] = None
    category: Optional[str] = None


class SampleResponse(BaseModel):
    """Response model for sample operations"""
    success: bool
    message: str
    sample: Optional[SampleMetadata] = None


class SampleListResponse(BaseModel):
    """Response model for listing samples"""
    success: bool
    samples: list[SampleMetadata]
    total: int

