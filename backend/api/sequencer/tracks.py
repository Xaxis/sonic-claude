"""
Track Routes - Operations for managing tracks within sequences
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.core.dependencies import get_sequencer_service
from backend.core.exceptions import (
    SequenceNotFoundError,
    TrackNotFoundError,
    InvalidTrackTypeError,
    ServiceError,
)
from backend.services.sequencer_service import SequencerService
from backend.models.sequence import SequencerTrack

router = APIRouter()
logger = logging.getLogger(__name__)


class CreateTrackRequest(BaseModel):
    """Request to create a track"""
    sequence_id: str  # Tracks now belong to sequences
    name: str
    type: Optional[str] = "sample"  # "midi", "audio", or "sample"
    color: Optional[str] = "#3b82f6"
    sample_id: Optional[str] = None  # For sample-based tracks
    sample_name: Optional[str] = None  # Cached sample name
    sample_file_path: Optional[str] = None  # Cached file path


class UpdateTrackMuteRequest(BaseModel):
    """Request to update track mute"""
    is_muted: bool


class UpdateTrackSoloRequest(BaseModel):
    """Request to update track solo"""
    is_solo: bool


class UpdateTrackRequest(BaseModel):
    """Request to update track properties"""
    name: Optional[str] = None
    volume: Optional[float] = Field(None, ge=0.0, le=2.0)
    pan: Optional[float] = Field(None, ge=-1.0, le=1.0)
    instrument: Optional[str] = None  # For MIDI tracks


@router.post("/tracks", response_model=SequencerTrack)
async def create_track(
    request: CreateTrackRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Create a new track in a sequence"""
    try:
        logger.info(f"Creating track: {request.dict()}")
        track = sequencer_service.create_track(
            sequence_id=request.sequence_id,
            name=request.name,
            track_type=request.type,
            color=request.color,
            sample_id=request.sample_id,
            sample_name=request.sample_name,
            sample_file_path=request.sample_file_path
        )
        if not track:
            raise SequenceNotFoundError(request.sequence_id)
        return track
    except Exception as e:
        logger.error(f"❌ Failed to create track: {e}")
        import traceback
        traceback.print_exc()
        raise


@router.get("/tracks", response_model=list[SequencerTrack])
async def get_tracks(
    sequence_id: Optional[str] = None,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Get all tracks (optionally filtered by sequence)"""
    return sequencer_service.get_tracks(sequence_id)


@router.get("/tracks/{track_id}", response_model=SequencerTrack)
async def get_track(
    track_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Get track by ID"""
    track = sequencer_service.get_track(track_id)
    if not track:
        raise TrackNotFoundError(track_id)
    return track


@router.put("/tracks/{track_id}/mute", response_model=SequencerTrack)
async def update_track_mute(
    track_id: str,
    request: UpdateTrackMuteRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Toggle track mute"""
    track = await sequencer_service.update_track_mute(track_id, request.is_muted)
    if not track:
        raise TrackNotFoundError(track_id)
    return track


@router.put("/tracks/{track_id}/solo", response_model=SequencerTrack)
async def update_track_solo(
    track_id: str,
    request: UpdateTrackSoloRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Toggle track solo"""
    track = await sequencer_service.update_track_solo(track_id, request.is_solo)
    if not track:
        raise TrackNotFoundError(track_id)
    return track


@router.put("/tracks/{track_id}", response_model=SequencerTrack)
async def update_track(
    track_id: str,
    request: UpdateTrackRequest,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Update track properties (name, volume, pan, instrument)"""
    track = sequencer_service.get_track(track_id)
    if not track:
        raise TrackNotFoundError(track_id)

    # Update name if provided
    if request.name is not None:
        track.name = request.name

    # Update instrument if provided (MIDI tracks only)
    if request.instrument is not None:
        if track.type != "midi":
            raise InvalidTrackTypeError("Set instrument", "MIDI")
        track.instrument = request.instrument
        logger.info(f"✅ Track {track_id} instrument set to: {request.instrument}")

    # Update volume and/or pan using the service method (which also updates active synths)
    if request.volume is not None or request.pan is not None:
        track = await sequencer_service.update_track(
            track_id,
            volume=request.volume,
            pan=request.pan
        )

    # Save the sequence containing this track (if not already saved by update_track)
    if request.name is not None or request.instrument is not None:
        sequence = sequencer_service.get_sequence(track.sequence_id)
        if sequence:
            sequencer_service.storage.save_sequence(sequence)

    return track


@router.delete("/tracks/{track_id}")
async def delete_track(
    track_id: str,
    sequencer_service: SequencerService = Depends(get_sequencer_service)
):
    """Delete a track"""
    try:
        track = sequencer_service.get_track(track_id)
        if not track:
            raise TrackNotFoundError(track_id)

        sequence_id = track.sequence_id
        success = sequencer_service.delete_track(track_id)
        if not success:
            raise ServiceError(f"Failed to delete track {track_id}")

        return {"status": "ok", "message": f"Track {track_id} deleted"}
    except Exception as e:
        logger.error(f"❌ Failed to delete track {track_id}: {e}")
        import traceback
        traceback.print_exc()
        raise ServiceError(f"Failed to delete track: {str(e)}")

