"""
Sequencer Routes - REST API for sequencer control
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.models.sequence import (
    Sequence,
    Clip,
    SequencerTrack,
    CreateSequenceRequest,
    AddClipRequest,
    UpdateClipRequest,
    SetTempoRequest,
    SeekRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Will be injected from main.py
sequencer_service = None


def set_sequencer_service(service):
    """Set the sequencer service instance"""
    global sequencer_service
    sequencer_service = service


# ============================================================================
# SEQUENCE ROUTES
# ============================================================================

@router.post("/sequences", response_model=Sequence)
async def create_sequence(request: CreateSequenceRequest):
    """Create a new sequence"""
    try:
        sequence = sequencer_service.create_sequence(request)
        return sequence
    except Exception as e:
        logger.error(f"❌ Failed to create sequence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sequences", response_model=list[Sequence])
async def get_sequences():
    """Get all sequences"""
    return sequencer_service.get_sequences()


@router.get("/sequences/{sequence_id}", response_model=Sequence)
async def get_sequence(sequence_id: str):
    """Get sequence by ID"""
    sequence = sequencer_service.get_sequence(sequence_id)
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")
    return sequence


@router.put("/sequences/{sequence_id}")
async def update_sequence(sequence_id: str, request: dict):
    """Update sequence properties (name, tempo, time_signature)"""
    sequence = sequencer_service.get_sequence(sequence_id)
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")

    # Update fields
    if "name" in request:
        sequence.name = request["name"]
    if "tempo" in request:
        sequence.tempo = request["tempo"]
    if "time_signature" in request:
        sequence.time_signature = request["time_signature"]

    # Save to disk
    sequencer_service.storage.save_sequence(sequence)

    return sequence


@router.delete("/sequences/{sequence_id}")
async def delete_sequence(sequence_id: str):
    """Delete a sequence"""
    success = sequencer_service.delete_sequence(sequence_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")
    return {"status": "ok", "message": f"Sequence {sequence_id} deleted"}


@router.post("/sequences/{sequence_id}/save")
async def save_sequence(sequence_id: str, create_version: bool = False):
    """
    Manually save sequence to disk

    Args:
        sequence_id: Sequence ID to save
        create_version: Whether to create a version snapshot
    """
    sequence = sequencer_service.get_sequence(sequence_id)
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")

    success = sequencer_service.storage.save_sequence(sequence, create_version=create_version)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save sequence")

    return {"status": "ok", "message": f"Sequence {sequence_id} saved", "version_created": create_version}


@router.get("/sequences/{sequence_id}/versions")
async def list_versions(sequence_id: str):
    """List all versions for a sequence"""
    versions = sequencer_service.storage.list_versions(sequence_id)
    return {"sequence_id": sequence_id, "versions": versions}


@router.post("/sequences/{sequence_id}/versions/{version_num}/restore")
async def restore_version(sequence_id: str, version_num: int):
    """Restore a sequence from a specific version"""
    version_sequence = sequencer_service.storage.load_version(sequence_id, version_num)
    if not version_sequence:
        raise HTTPException(status_code=404, detail=f"Version {version_num} not found")

    # Save current state as a version before restoring
    current_sequence = sequencer_service.get_sequence(sequence_id)
    if current_sequence:
        sequencer_service.storage.save_sequence(current_sequence, create_version=True)

    # Update in-memory sequence
    sequencer_service.sequences[sequence_id] = version_sequence

    # Save restored version as current
    sequencer_service.storage.save_sequence(version_sequence)

    return {"status": "ok", "message": f"Restored sequence to version {version_num}"}


@router.post("/sequences/{sequence_id}/recover")
async def recover_from_autosave(sequence_id: str):
    """Recover sequence from autosave file"""
    recovered_sequence = sequencer_service.storage.recover_from_autosave(sequence_id)
    if not recovered_sequence:
        raise HTTPException(status_code=404, detail=f"No autosave found for sequence {sequence_id}")

    # Update in-memory sequence
    sequencer_service.sequences[sequence_id] = recovered_sequence

    # Save recovered version
    sequencer_service.storage.save_sequence(recovered_sequence, create_version=True)

    return {"status": "ok", "message": f"Recovered sequence from autosave"}


# ============================================================================
# CLIP ROUTES
# ============================================================================

@router.post("/sequences/{sequence_id}/clips", response_model=Clip)
async def add_clip(sequence_id: str, request: AddClipRequest):
    """Add a clip to a sequence"""
    clip = sequencer_service.add_clip(sequence_id, request)
    if not clip:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")
    return clip


@router.get("/sequences/{sequence_id}/clips", response_model=list[Clip])
async def get_clips(sequence_id: str):
    """Get all clips in a sequence"""
    clips = sequencer_service.get_clips(sequence_id)
    if clips is None:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")
    return clips


@router.put("/sequences/{sequence_id}/clips/{clip_id}", response_model=Clip)
async def update_clip(sequence_id: str, clip_id: str, request: UpdateClipRequest):
    """Update a clip"""
    clip = sequencer_service.update_clip(sequence_id, clip_id, request)
    if not clip:
        raise HTTPException(status_code=404, detail=f"Clip {clip_id} not found in sequence {sequence_id}")
    return clip


@router.delete("/sequences/{sequence_id}/clips/{clip_id}")
async def delete_clip(sequence_id: str, clip_id: str):
    """Delete a clip"""
    success = sequencer_service.delete_clip(sequence_id, clip_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Clip {clip_id} not found in sequence {sequence_id}")
    return {"status": "ok", "message": f"Clip {clip_id} deleted"}


@router.post("/sequences/{sequence_id}/clips/{clip_id}/duplicate", response_model=Clip)
async def duplicate_clip(sequence_id: str, clip_id: str):
    """Duplicate a clip"""
    clip = sequencer_service.duplicate_clip(sequence_id, clip_id)
    if not clip:
        raise HTTPException(status_code=404, detail=f"Clip {clip_id} not found in sequence {sequence_id}")
    return clip


# ============================================================================
# TRACK ROUTES
# ============================================================================

class CreateTrackRequest(BaseModel):
    """Request to create a track"""
    sequence_id: str  # Tracks now belong to sequences
    name: str
    type: Optional[str] = "sample"  # "midi", "audio", or "sample"
    color: Optional[str] = "#3b82f6"
    sample_id: Optional[str] = None  # For sample-based tracks
    sample_name: Optional[str] = None  # Cached sample name
    sample_file_path: Optional[str] = None  # Cached file path


@router.post("/tracks", response_model=SequencerTrack)
async def create_track(request: CreateTrackRequest):
    """Create a new track in a sequence"""
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
        raise HTTPException(status_code=404, detail=f"Sequence {request.sequence_id} not found")
    return track


@router.get("/tracks", response_model=list[SequencerTrack])
async def get_tracks(sequence_id: Optional[str] = None):
    """Get all tracks (optionally filtered by sequence)"""
    return sequencer_service.get_tracks(sequence_id)


@router.get("/tracks/{track_id}", response_model=SequencerTrack)
async def get_track(track_id: str):
    """Get track by ID"""
    track = sequencer_service.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    return track


class UpdateTrackMuteRequest(BaseModel):
    """Request to update track mute"""
    is_muted: bool


class UpdateTrackSoloRequest(BaseModel):
    """Request to update track solo"""
    is_solo: bool


@router.put("/tracks/{track_id}/mute", response_model=SequencerTrack)
async def update_track_mute(track_id: str, request: UpdateTrackMuteRequest):
    """Toggle track mute"""
    track = sequencer_service.update_track_mute(track_id, request.is_muted)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    return track


@router.put("/tracks/{track_id}/solo", response_model=SequencerTrack)
async def update_track_solo(track_id: str, request: UpdateTrackSoloRequest):
    """Toggle track solo"""
    track = sequencer_service.update_track_solo(track_id, request.is_solo)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")
    return track


class UpdateTrackRequest(BaseModel):
    """Request to update track properties"""
    name: Optional[str] = None


@router.put("/tracks/{track_id}", response_model=SequencerTrack)
async def update_track(track_id: str, request: UpdateTrackRequest):
    """Update track properties (e.g., rename)"""
    track = sequencer_service.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")

    # Update fields
    if request.name is not None:
        track.name = request.name

    # Save the sequence containing this track
    sequence = sequencer_service.get_sequence(track.sequence_id)
    if sequence:
        sequencer_service.storage.save_sequence(sequence)

    return track


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    """Delete a track"""
    track = sequencer_service.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")

    sequence_id = track.sequence_id
    success = sequencer_service.delete_track(track_id)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to delete track {track_id}")

    return {"status": "ok", "message": f"Track {track_id} deleted"}


# ============================================================================
# PLAYBACK ROUTES
# ============================================================================

class PlaySequenceRequest(BaseModel):
    """Request to play a sequence"""
    position: Optional[float] = 0.0


@router.post("/sequences/{sequence_id}/play")
async def play_sequence(sequence_id: str, request: PlaySequenceRequest):
    """Start playing a sequence"""
    try:
        await sequencer_service.play_sequence(sequence_id, request.position)
        return {
            "status": "playing",
            "sequence_id": sequence_id,
            "position": request.position,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Failed to play sequence: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_playback():
    """Stop playback"""
    await sequencer_service.stop_playback()
    return {"status": "stopped"}


@router.post("/pause")
async def pause_playback():
    """Pause playback"""
    await sequencer_service.pause_playback()
    return {"status": "paused"}


@router.post("/resume")
async def resume_playback():
    """Resume playback"""
    await sequencer_service.resume_playback()
    return {"status": "playing"}


@router.put("/tempo")
async def set_tempo(request: SetTempoRequest):
    """Set global tempo"""
    sequencer_service.set_tempo(request.tempo)
    return {"status": "ok", "tempo": request.tempo}


@router.put("/seek")
async def seek(request: SeekRequest):
    """Seek to position"""
    sequencer_service.seek(request.position)
    return {"status": "ok", "position": request.position}


@router.get("/state")
async def get_playback_state():
    """Get current playback state"""
    return sequencer_service.get_playback_state()


