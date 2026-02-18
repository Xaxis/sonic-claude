"""
Input Routes - Control audio input device and monitoring
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class SetInputDeviceRequest(BaseModel):
    """Request model for setting audio input device"""
    device_index: int
    amp: float = 1.0


class SetInputGainRequest(BaseModel):
    """Request model for setting input gain"""
    amp: float


@router.post("/input/device")
async def set_input_device(request: SetInputDeviceRequest):
    """Set the audio input device for SuperCollider"""
    # For now, just return success - actual implementation would configure SC
    logger.info(f"📥 Set input device: {request.device_index}, amp: {request.amp}")
    return {"status": "ok", "device_index": request.device_index, "amp": request.amp}


@router.post("/input/stop")
async def stop_input():
    """Stop audio input monitoring"""
    logger.info("⏹️  Stop input monitoring")
    return {"status": "ok"}


@router.post("/input/gain")
async def set_input_gain(request: SetInputGainRequest):
    """Set input gain/amplitude"""
    logger.info(f"🔊 Set input gain: {request.amp}")
    return {"status": "ok", "amp": request.amp}


@router.get("/input/status")
async def get_input_status():
    """Get current audio input status"""
    return {
        "is_active": False,
        "current_device": None
    }

