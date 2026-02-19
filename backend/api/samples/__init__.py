"""
Samples API - Modular router combining all sample endpoints

This module organizes sample routes into logical groups:
- crud: Upload, get, update, delete samples
- metadata: Duration updates and metadata management
"""
from fastapi import APIRouter

from . import crud, metadata

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(crud.router, tags=["samples"])
router.include_router(metadata.router, tags=["samples"])

