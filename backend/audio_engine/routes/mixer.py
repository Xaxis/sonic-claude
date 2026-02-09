"""
Mixer API Routes
REST API for mixer control
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from backend.core import get_logger
from ..services.mixer_service import MixerService

logger = get_logger(__name__)

router = APIRouter(prefix="/audio/mixer", tags=["Audio Engine - Mixer"])

# Service instance (injected)
_mixer_service: Optional[MixerService] = None


def set_mixer_service(service: MixerService):
    """Inject mixer service"""
    global _mixer_service
    _mixer_service = service
    logger.info("Mixer service injected into routes")


# ===== REQUEST/RESPONSE MODELS =====

class CreateTrackRequest(BaseModel):
    """Request to create a track"""
    name: str = Field(..., description="Track name")
    input_bus: Optional[int] = Field(None, description="Input bus ID")
    output_bus: Optional[int] = Field(None, description="Output bus ID")


class UpdateTrackVolumeRequest(BaseModel):
    """Request to update track volume"""
    volume: float = Field(..., ge=0.0, le=2.0, description="Volume (0.0 to 2.0)")


class UpdateTrackPanRequest(BaseModel):
    """Request to update track pan"""
    pan: float = Field(..., ge=-1.0, le=1.0, description="Pan (-1.0 left to 1.0 right)")


class SetSendLevelRequest(BaseModel):
    """Request to set send level"""
    aux_track_id: str = Field(..., description="Aux track ID")
    level: float = Field(..., ge=0.0, le=1.0, description="Send level (0.0 to 1.0)")


class AddEffectRequest(BaseModel):
    """Request to add effect to track"""
    effect_id: int = Field(..., description="Effect ID")


class CreateGroupTrackRequest(BaseModel):
    """Request to create group track"""
    name: str = Field(..., description="Group track name")
    track_ids: List[str] = Field(..., description="Track IDs to group")


class TrackResponse(BaseModel):
    """Track response"""
    id: str
    name: str
    volume: float
    pan: float
    muted: bool
    soloed: bool
    input_bus: Optional[int]
    output_bus: Optional[int]
    effect_chain: List[int]
    sends: Dict[str, float]


# ===== ROUTES =====

@router.post("/tracks", response_model=TrackResponse)
async def create_track(request: CreateTrackRequest):
    """Create a new track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        track = await _mixer_service.create_track(
            name=request.name,
            input_bus=request.input_bus,
            output_bus=request.output_bus
        )

        return TrackResponse(
            id=track.id,
            name=track.name,
            volume=track.volume,
            pan=track.pan,
            muted=track.muted,
            soloed=track.soloed,
            input_bus=track.input_bus,
            output_bus=track.output_bus,
            effect_chain=[e.id for e in track.effect_chain],
            sends=track.sends
        )
    except Exception as e:
        logger.error(f"Failed to create track: {e}")
        raise HTTPException(status_code=500, detail="Failed to create track")


@router.get("/tracks", response_model=List[TrackResponse])
async def get_tracks():
    """Get all tracks"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    tracks = _mixer_service.get_all_tracks()
    return [
        TrackResponse(
            id=track.id,
            name=track.name,
            volume=track.volume,
            pan=track.pan,
            muted=track.muted,
            soloed=track.soloed,
            input_bus=track.input_bus,
            output_bus=track.output_bus,
            effect_chain=[e.id for e in track.effect_chain],
            sends=track.sends
        )
        for track in tracks
    ]


@router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(track_id: str):
    """Get track by ID"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    track = _mixer_service.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")

    return TrackResponse(
        id=track.id,
        name=track.name,
        volume=track.volume,
        pan=track.pan,
        muted=track.muted,
        soloed=track.soloed,
        input_bus=track.input_bus,
        output_bus=track.output_bus,
        effect_chain=[e.id for e in track.effect_chain],
        sends=track.sends
    )


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    """Delete a track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    await _mixer_service.delete_track(track_id)
    return {"status": "deleted", "track_id": track_id}


@router.put("/tracks/{track_id}/volume")
async def set_track_volume(track_id: str, request: UpdateTrackVolumeRequest):
    """Set track volume"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.set_track_volume(track_id, request.volume)
        return {"status": "updated", "track_id": track_id, "volume": request.volume}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/pan")
async def set_track_pan(track_id: str, request: UpdateTrackPanRequest):
    """Set track pan"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.set_track_pan(track_id, request.pan)
        return {"status": "updated", "track_id": track_id, "pan": request.pan}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/mute")
async def mute_track(track_id: str):
    """Mute a track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.mute_track(track_id)
        return {"status": "muted", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/unmute")
async def unmute_track(track_id: str):
    """Unmute a track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.unmute_track(track_id)
        return {"status": "unmuted", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/solo")
async def solo_track(track_id: str):
    """Solo a track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.solo_track(track_id)
        return {"status": "soloed", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/unsolo")
async def unsolo_track(track_id: str):
    """Unsolo a track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.unsolo_track(track_id)
        return {"status": "unsoloed", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/sends")
async def set_send_level(track_id: str, request: SetSendLevelRequest):
    """Set send level from track to aux"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.set_send_level(track_id, request.aux_track_id, request.level)
        return {"status": "updated", "track_id": track_id, "aux_track_id": request.aux_track_id, "level": request.level}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/tracks/{track_id}/effects")
async def add_effect_to_track(track_id: str, request: AddEffectRequest):
    """Add effect to track's effect chain"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        # Get effect from effects service
        from ..services import EffectsService
        effects_service = _mixer_service.engine.effects  # Access through engine
        effect = effects_service.get_effect(request.effect_id)
        if not effect:
            raise HTTPException(status_code=404, detail=f"Effect {request.effect_id} not found")

        await _mixer_service.add_effect_to_track(track_id, effect)
        return {"status": "added", "track_id": track_id, "effect_id": request.effect_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/tracks/{track_id}/effects/{effect_id}")
async def remove_effect_from_track(track_id: str, effect_id: int):
    """Remove effect from track's effect chain"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        await _mixer_service.remove_effect_from_track(track_id, effect_id)
        return {"status": "removed", "track_id": track_id, "effect_id": effect_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/groups", response_model=TrackResponse)
async def create_group_track(request: CreateGroupTrackRequest):
    """Create a group track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    try:
        track = await _mixer_service.create_group_track(request.name, request.track_ids)
        return TrackResponse(
            id=track.id,
            name=track.name,
            volume=track.volume,
            pan=track.pan,
            muted=track.muted,
            soloed=track.soloed,
            input_bus=track.input_bus,
            output_bus=track.output_bus,
            effect_chain=[e.id for e in track.effect_chain],
            sends=track.sends
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    """Delete a track"""
    if not _mixer_service:
        raise HTTPException(status_code=503, detail="Mixer service not initialized")

    await _mixer_service.delete_track(track_id)
    return {"status": "deleted", "track_id": track_id}

