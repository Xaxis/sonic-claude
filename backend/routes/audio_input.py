"""
Audio Input API Routes
Endpoints for managing audio input devices
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from backend.core.dependencies import get_audio_input_service
from backend.services.audio_input_service import AudioInputService
from backend.core import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/audio/input", tags=["audio-input"])


class SetInputDeviceRequest(BaseModel):
    """Request to set audio input device"""
    device_index: int = Field(..., ge=0, description="SuperCollider input device index (0-based)")
    amp: float = Field(1.0, ge=0.0, le=2.0, description="Input gain (0.0 to 2.0)")


class SetInputGainRequest(BaseModel):
    """Request to set input gain"""
    amp: float = Field(..., ge=0.0, le=2.0, description="Input gain (0.0 to 2.0)")


class AudioInputStatus(BaseModel):
    """Audio input status response"""
    is_active: bool
    current_device: Optional[int]


@router.post("/device")
async def set_input_device(
    request: SetInputDeviceRequest,
    service: AudioInputService = Depends(get_audio_input_service)
):
    """
    Set the audio input device for SuperCollider
    
    This creates a SoundIn synth that captures audio from the specified device
    and routes it to SuperCollider's master bus for processing.
    """
    try:
        success = await service.set_input_device(request.device_index, request.amp)
        if success:
            return {
                "success": True,
                "message": f"Input device set to index {request.device_index}",
                "device_index": request.device_index,
                "amp": request.amp
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to set input device")
    except Exception as e:
        logger.error(f"Error setting input device: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_input(
    service: AudioInputService = Depends(get_audio_input_service)
):
    """Stop audio input"""
    try:
        success = await service.stop_input()
        if success:
            return {"success": True, "message": "Audio input stopped"}
        else:
            return {"success": False, "message": "No active input to stop"}
    except Exception as e:
        logger.error(f"Error stopping input: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gain")
async def set_input_gain(
    request: SetInputGainRequest,
    service: AudioInputService = Depends(get_audio_input_service)
):
    """Set input gain without changing the device"""
    try:
        success = await service.set_input_gain(request.amp)
        if success:
            return {"success": True, "amp": request.amp}
        else:
            raise HTTPException(status_code=400, detail="No active input synth")
    except Exception as e:
        logger.error(f"Error setting input gain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=AudioInputStatus)
async def get_input_status(
    service: AudioInputService = Depends(get_audio_input_service)
):
    """Get current audio input status"""
    current_device = service.get_current_device()
    return AudioInputStatus(
        is_active=current_device is not None,
        current_device=current_device
    )

