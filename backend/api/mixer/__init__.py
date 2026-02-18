"""
Mixer API - Modular router combining all mixer endpoints

This module organizes mixer routes into logical groups:
- channels: Channel CRUD operations
- master: Master channel controls
- metering: Real-time metering updates
"""
from fastapi import APIRouter

from . import channels, master

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(channels.router, tags=["mixer-channels"])
router.include_router(master.router, tags=["mixer-master"])

