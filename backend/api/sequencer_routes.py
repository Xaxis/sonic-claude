"""
Sequencer Routes - REST API for sequencer control
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

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
    """Update sequence properties (name, tempo, time_signature, loop settings)"""
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
    if "loop_enabled" in request:
        sequence.loop_enabled = request["loop_enabled"]
    if "loop_start" in request:
        sequence.loop_start = request["loop_start"]
    if "loop_end" in request:
        sequence.loop_end = request["loop_end"]

    # UI settings
    if "zoom" in request:
        sequence.zoom = request["zoom"]
    if "snap_enabled" in request:
        sequence.snap_enabled = request["snap_enabled"]
    if "grid_size" in request:
        sequence.grid_size = request["grid_size"]

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
            raise HTTPException(status_code=404, detail=f"Sequence {request.sequence_id} not found")
        return track
    except Exception as e:
        logger.error(f"❌ Failed to create track: {e}")
        import traceback
        traceback.print_exc()
        raise


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
    volume: Optional[float] = Field(None, ge=0.0, le=2.0)
    pan: Optional[float] = Field(None, ge=-1.0, le=1.0)
    instrument: Optional[str] = None  # For MIDI tracks


@router.put("/tracks/{track_id}", response_model=SequencerTrack)
async def update_track(track_id: str, request: UpdateTrackRequest):
    """Update track properties (name, volume, pan, instrument)"""
    track = sequencer_service.get_track(track_id)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track {track_id} not found")

    # Update fields
    if request.name is not None:
        track.name = request.name
    if request.volume is not None:
        track.volume = request.volume
    if request.pan is not None:
        track.pan = request.pan
    if request.instrument is not None:
        if track.type != "midi":
            raise HTTPException(status_code=400, detail="Instrument can only be set on MIDI tracks")
        track.instrument = request.instrument
        logger.info(f"✅ Track {track_id} instrument set to: {request.instrument}")

    # Save the sequence containing this track
    sequence = sequencer_service.get_sequence(track.sequence_id)
    if sequence:
        sequencer_service.storage.save_sequence(sequence)

    return track


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    """Delete a track"""
    try:
        track = sequencer_service.get_track(track_id)
        if not track:
            raise HTTPException(status_code=404, detail=f"Track {track_id} not found")

        sequence_id = track.sequence_id
        success = sequencer_service.delete_track(track_id)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to delete track {track_id}")

        return {"status": "ok", "message": f"Track {track_id} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete track {track_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete track: {str(e)}")


# ============================================================================
# SYNTHDEF ROUTES
# ============================================================================

class SynthDefInfo(BaseModel):
    """SynthDef information"""
    name: str
    display_name: str
    category: str
    description: str
    parameters: list[str]


@router.get("/synthdefs", response_model=list[SynthDefInfo])
async def get_synthdefs():
    """Get list of available SynthDefs for MIDI tracks"""
    # This is a static list based on what's loaded in load_synthdefs.scd
    # In a more advanced system, this could query SuperCollider dynamically
    synthdefs = [
        # Basic Synths
        SynthDefInfo(
            name="sine",
            display_name="Sine Wave",
            category="Basic",
            description="Simple sine wave oscillator",
            parameters=["attack", "release"]
        ),
        SynthDefInfo(
            name="saw",
            display_name="Saw Wave",
            category="Basic",
            description="Sawtooth wave with low-pass filter",
            parameters=["attack", "release", "cutoff"]
        ),
        SynthDefInfo(
            name="square",
            display_name="Square Wave",
            category="Basic",
            description="Square/pulse wave with variable width",
            parameters=["attack", "release", "width"]
        ),

        # Professional Instruments
        SynthDefInfo(
            name="fm",
            display_name="FM Synth",
            category="Synth",
            description="Frequency modulation synthesis",
            parameters=["attack", "decay", "sustain", "release", "modRatio", "modIndex"]
        ),
        SynthDefInfo(
            name="subtractive",
            display_name="Subtractive Synth",
            category="Synth",
            description="Analog-style subtractive synthesis",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "filterEnv"]
        ),
        SynthDefInfo(
            name="pad",
            display_name="Pad Synth",
            category="Synth",
            description="Lush, detuned pad sound",
            parameters=["attack", "decay", "sustain", "release", "detune", "cutoff"]
        ),
        SynthDefInfo(
            name="bass",
            display_name="Bass Synth",
            category="Bass",
            description="Deep, punchy bass sound",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "drive"]
        ),
        SynthDefInfo(
            name="lead",
            display_name="Lead Synth",
            category="Lead",
            description="Bright, cutting lead sound",
            parameters=["attack", "decay", "sustain", "release", "cutoff", "resonance", "detune"]
        ),
        SynthDefInfo(
            name="pluck",
            display_name="Plucked String",
            category="Acoustic",
            description="Karplus-Strong plucked string",
            parameters=["attack", "release", "coef"]
        ),
        SynthDefInfo(
            name="bell",
            display_name="Bell",
            category="Acoustic",
            description="Metallic bell/mallet sound",
            parameters=["attack", "release", "brightness"]
        ),
        SynthDefInfo(
            name="organ",
            display_name="Organ",
            category="Keys",
            description="Tonewheel organ sound",
            parameters=["attack", "release", "drawbar1", "drawbar2", "drawbar3"]
        ),
    ]

    return synthdefs


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
    """Seek to position with optional audio scrubbing"""
    await sequencer_service.seek(request.position, request.trigger_audio)
    return {"status": "ok", "position": request.position, "trigger_audio": request.trigger_audio}


@router.get("/state")
async def get_playback_state():
    """Get current playback state"""
    return sequencer_service.get_playback_state()


# ============================================================================
# METRONOME ROUTES
# ============================================================================

@router.put("/metronome/toggle")
async def toggle_metronome():
    """Toggle metronome on/off"""
    try:
        enabled = sequencer_service.toggle_metronome()
        return {"enabled": enabled}
    except Exception as e:
        logger.error(f"❌ Failed to toggle metronome: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SetMetronomeVolumeRequest(BaseModel):
    volume: float


class PreviewNoteRequest(BaseModel):
    """Request model for previewing a MIDI note"""
    note: int = Field(..., ge=0, le=127, description="MIDI note number (0-127)")
    velocity: int = Field(default=100, ge=1, le=127, description="Note velocity (1-127)")
    duration: float = Field(default=0.5, gt=0, description="Note duration in seconds")
    instrument: str = Field(default="sine", description="Instrument/synthdef to use")


@router.put("/metronome/volume")
async def set_metronome_volume(request: SetMetronomeVolumeRequest):
    """Set metronome volume (0.0 to 1.0)"""
    try:
        sequencer_service.set_metronome_volume(request.volume)
        return {"volume": request.volume}
    except Exception as e:
        logger.error(f"❌ Failed to set metronome volume: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# NOTE PREVIEW ROUTES
# ============================================================================

@router.post("/preview-note")
async def preview_note(request: PreviewNoteRequest):
    """
    Preview a MIDI note with specified instrument

    Triggers a one-shot note playback for UI feedback (piano keyboard clicks, note editing, etc.)
    """
    try:
        await sequencer_service.preview_note(
            note=request.note,
            velocity=request.velocity,
            duration=request.duration,
            instrument=request.instrument
        )
        return {
            "status": "ok",
            "note": request.note,
            "velocity": request.velocity,
            "duration": request.duration,
            "instrument": request.instrument
        }
    except Exception as e:
        logger.error(f"❌ Failed to preview note: {e}")
        raise HTTPException(status_code=500, detail=str(e))