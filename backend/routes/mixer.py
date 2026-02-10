"""
Mixer API Routes
REST API for mixer control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from backend.core import get_logger
from backend.core.dependencies import get_mixer_service
from ..services.mixer_service import MixerService

logger = get_logger(__name__)

router = APIRouter(prefix="/audio/mixer", tags=["Audio Engine - Mixer"])


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
async def create_track(request: CreateTrackRequest, service: MixerService = Depends(get_mixer_service)):
    """Create a new track"""
    try:
        track = await service.create_track(
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
async def get_tracks(service: MixerService = Depends(get_mixer_service)):
    """Get all tracks"""
    tracks = service.get_all_tracks()
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
async def get_track(track_id: str, service: MixerService = Depends(get_mixer_service)):
    """Get track by ID"""
    track = service.get_track(track_id)
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
    await service.delete_track(track_id)
    return {"status": "deleted", "track_id": track_id}


@router.put("/tracks/{track_id}/volume")
async def set_track_volume(track_id: str, request: UpdateTrackVolumeRequest, service: MixerService = Depends(get_mixer_service)):
    """Set track volume"""
    try:
        await service.set_track_volume(track_id, request.volume)
        return {"status": "updated", "track_id": track_id, "volume": request.volume}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/pan")
async def set_track_pan(track_id: str, request: UpdateTrackPanRequest, service: MixerService = Depends(get_mixer_service)):
    """Set track pan"""
    try:
        await service.set_track_pan(track_id, request.pan)
        return {"status": "updated", "track_id": track_id, "pan": request.pan}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/mute")
async def mute_track(track_id: str, service: MixerService = Depends(get_mixer_service)):
    """Mute a track"""
    try:
        await service.mute_track(track_id)
        return {"status": "muted", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/unmute")
async def unmute_track(track_id: str, service: MixerService = Depends(get_mixer_service)):
    """Unmute a track"""
    try:
        await service.unmute_track(track_id)
        return {"status": "unmuted", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/solo")
async def solo_track(track_id: str, service: MixerService = Depends(get_mixer_service)):
    """Solo a track"""
    try:
        await service.solo_track(track_id)
        return {"status": "soloed", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/unsolo")
async def unsolo_track(track_id: str, service: MixerService = Depends(get_mixer_service)):
    """Unsolo a track"""
    try:
        await service.unsolo_track(track_id)
        return {"status": "unsoloed", "track_id": track_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/tracks/{track_id}/sends")
async def set_send_level(track_id: str, request: SetSendLevelRequest, service: MixerService = Depends(get_mixer_service)):
    """Set send level from track to aux"""
    try:
        await service.set_send_level(track_id, request.aux_track_id, request.level)
        return {"status": "updated", "track_id": track_id, "aux_track_id": request.aux_track_id, "level": request.level}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/tracks/{track_id}/effects")
async def add_effect_to_track(track_id: str, request: AddEffectRequest, service: MixerService = Depends(get_mixer_service)):
    """Add effect to track's effect chain"""
    try:
        # Get effect from effects service
        from ..services import EffectsService
        effects_service = service.engine.effects  # Access through engine
        effect = effects_service.get_effect(request.effect_id)
        if not effect:
            raise HTTPException(status_code=404, detail=f"Effect {request.effect_id} not found")

        await service.add_effect_to_track(track_id, effect)
        return {"status": "added", "track_id": track_id, "effect_id": request.effect_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/tracks/{track_id}/effects/{effect_id}")
async def remove_effect_from_track(track_id: str, effect_id: int, service: MixerService = Depends(get_mixer_service)):
    """Remove effect from track's effect chain"""
    try:
        await service.remove_effect_from_track(track_id, effect_id)
        return {"status": "removed", "track_id": track_id, "effect_id": effect_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/groups", response_model=TrackResponse)
async def create_group_track(request: CreateGroupTrackRequest, service: MixerService = Depends(get_mixer_service)):
    """Create a group track"""
    try:
        track = await service.create_group_track(request.name, request.track_ids)
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
async def delete_track(track_id: str, service: MixerService = Depends(get_mixer_service)):
    """Delete a track"""
    await service.delete_track(track_id)
    return {"status": "deleted", "track_id": track_id}

