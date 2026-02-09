"""
Sequencer API Routes
REST API for sequencer control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from backend.core import get_logger, get_sequencer_service
from ..services.sequencer_service import SequencerService
from ..models.sequence import MIDINote, MIDIClip, AudioClip

logger = get_logger(__name__)

router = APIRouter(prefix="/audio/sequencer", tags=["Audio Engine - Sequencer"])


# ===== REQUEST/RESPONSE MODELS =====

class CreateSequenceRequest(BaseModel):
    """Request to create a sequence"""
    name: str = Field(..., description="Sequence name")
    tempo: float = Field(default=120.0, ge=20.0, le=300.0, description="Tempo in BPM")
    time_signature: tuple[int, int] = Field(default=(4, 4), description="Time signature")


class MIDINoteRequest(BaseModel):
    """MIDI note data"""
    note: int = Field(..., ge=0, le=127, description="MIDI note number")
    velocity: float = Field(..., ge=0.0, le=1.0, description="Note velocity")
    time: float = Field(..., ge=0.0, description="Note start time in beats")
    duration: float = Field(..., gt=0.0, description="Note duration in beats")


class AddMIDIClipRequest(BaseModel):
    """Request to add MIDI clip"""
    track_id: str = Field(..., description="Track ID")
    start_time: float = Field(..., ge=0.0, description="Clip start time in beats")
    duration: float = Field(..., gt=0.0, description="Clip duration in beats")
    synthdef: str = Field(..., description="SynthDef to use")
    notes: List[MIDINoteRequest] = Field(..., description="MIDI notes")


class AddAudioClipRequest(BaseModel):
    """Request to add audio clip"""
    track_id: str = Field(..., description="Track ID")
    start_time: float = Field(..., ge=0.0, description="Clip start time in beats")
    duration: float = Field(..., gt=0.0, description="Clip duration in beats")
    sample_path: str = Field(..., description="Path to audio sample")
    offset: float = Field(default=0.0, ge=0.0, description="Sample offset in seconds")


class UpdateClipRequest(BaseModel):
    """Request to update clip"""
    start_time: Optional[float] = Field(None, ge=0.0, description="New start time")
    duration: Optional[float] = Field(None, gt=0.0, description="New duration")
    muted: Optional[bool] = Field(None, description="Mute state")


class PlaybackControlRequest(BaseModel):
    """Request for playback control"""
    position: float = Field(default=0.0, ge=0.0, description="Start position in beats")


class SetTempoRequest(BaseModel):
    """Request to set tempo"""
    tempo: float = Field(..., ge=20.0, le=300.0, description="Tempo in BPM")


class SeekRequest(BaseModel):
    """Request to seek"""
    position: float = Field(..., ge=0.0, description="Position in beats")


class SequenceResponse(BaseModel):
    """Sequence response"""
    id: str
    name: str
    tempo: float
    time_signature: tuple[int, int]
    is_looping: bool
    loop_start: float
    loop_end: float
    clip_count: int


class PlaybackStateResponse(BaseModel):
    """Playback state response"""
    is_playing: bool
    current_sequence: Optional[str]
    playhead_position: float
    tempo: float
    active_notes: int


# ===== ROUTES =====

@router.post("/sequences", response_model=SequenceResponse)
async def create_sequence(request: CreateSequenceRequest, service: SequencerService = Depends(get_sequencer_service)):
    """Create a new sequence"""
    try:
        sequence = service.create_sequence(
            name=request.name,
            tempo=request.tempo,
            time_signature=request.time_signature
        )

        return SequenceResponse(
            id=sequence.id,
            name=sequence.name,
            tempo=sequence.tempo,
            time_signature=sequence.time_signature,
            is_looping=sequence.is_looping,
            loop_start=sequence.loop_start,
            loop_end=sequence.loop_end,
            clip_count=len(sequence.clips)
        )
    except Exception as e:
        logger.error(f"Failed to create sequence: {e}")
        raise HTTPException(status_code=500, detail="Failed to create sequence")


@router.get("/sequences", response_model=List[SequenceResponse])
async def get_sequences(service: SequencerService = Depends(get_sequencer_service)):
    """Get all sequences"""
    sequences = service.get_all_sequences()
    return [
        SequenceResponse(
            id=seq.id,
            name=seq.name,
            tempo=seq.tempo,
            time_signature=seq.time_signature,
            is_looping=seq.is_looping,
            loop_start=seq.loop_start,
            loop_end=seq.loop_end,
            clip_count=len(seq.clips)
        )
        for seq in sequences
    ]


@router.get("/sequences/{sequence_id}", response_model=SequenceResponse)
async def get_sequence(sequence_id: str, service: SequencerService = Depends(get_sequencer_service)):
    """Get sequence by ID"""
    sequence = service.get_sequence(sequence_id)
    if not sequence:
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")

    return SequenceResponse(
        id=sequence.id,
        name=sequence.name,
        tempo=sequence.tempo,
        time_signature=sequence.time_signature,
        is_looping=sequence.is_looping,
        loop_start=sequence.loop_start,
        loop_end=sequence.loop_end,
        clip_count=len(sequence.clips)
    )


@router.delete("/sequences/{sequence_id}")
async def delete_sequence(sequence_id: str, service: SequencerService = Depends(get_sequencer_service)):
    """Delete a sequence"""
    try:
        await service.delete_sequence(sequence_id)
        return {"status": "deleted", "sequence_id": sequence_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/sequences/{sequence_id}/clips/midi")
async def add_midi_clip(sequence_id: str, request: AddMIDIClipRequest, service: SequencerService = Depends(get_sequencer_service)):
    """Add MIDI clip to sequence"""
    try:
        # Convert request notes to MIDINote objects
        notes = [
            MIDINote(
                note=n.note,
                velocity=n.velocity,
                time=n.time,
                duration=n.duration
            )
            for n in request.notes
        ]

        # Create MIDI clip
        midi_clip = MIDIClip(
            synthdef=request.synthdef,
            notes=notes
        )

        clip_id = service.add_clip(
            sequence_id=sequence_id,
            track_id=request.track_id,
            start_time=request.start_time,
            duration=request.duration,
            content=midi_clip
        )

        return {"status": "added", "clip_id": clip_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/sequences/{sequence_id}/clips/audio")
async def add_audio_clip(sequence_id: str, request: AddAudioClipRequest, service: SequencerService = Depends(get_sequencer_service)):
    """Add audio clip to sequence"""
    try:
        # Create audio clip
        audio_clip = AudioClip(
            sample_path=request.sample_path,
            offset=request.offset
        )

        clip_id = service.add_clip(
            sequence_id=sequence_id,
            track_id=request.track_id,
            start_time=request.start_time,
            duration=request.duration,
            content=audio_clip
        )

        return {"status": "added", "clip_id": clip_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/sequences/{sequence_id}/clips/{clip_id}")
async def remove_clip(sequence_id: str, clip_id: str, service: SequencerService = Depends(get_sequencer_service)):
    """Remove clip from sequence"""
    try:
        service.remove_clip(sequence_id, clip_id)
        return {"status": "removed", "clip_id": clip_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/sequences/{sequence_id}/clips/{clip_id}")
async def update_clip(sequence_id: str, clip_id: str, request: UpdateClipRequest, service: SequencerService = Depends(get_sequencer_service)):
    """Update clip properties"""
    try:
        service.update_clip(
            sequence_id=sequence_id,
            clip_id=clip_id,
            start_time=request.start_time,
            duration=request.duration,
            muted=request.muted
        )
        return {"status": "updated", "clip_id": clip_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/sequences/{sequence_id}/play")
async def play_sequence(sequence_id: str, request: PlaybackControlRequest = PlaybackControlRequest(), service: SequencerService = Depends(get_sequencer_service)):
    """Start playback of sequence"""
    try:
        await service.play(sequence_id, request.position)
        return {"status": "playing", "sequence_id": sequence_id, "position": request.position}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/stop")
async def stop_playback(service: SequencerService = Depends(get_sequencer_service)):
    """Stop playback"""
    await service.stop()
    return {"status": "stopped"}


@router.post("/pause")
async def pause_playback(service: SequencerService = Depends(get_sequencer_service)):
    """Pause playback"""
    await service.pause()
    return {"status": "paused"}


@router.post("/resume")
async def resume_playback(service: SequencerService = Depends(get_sequencer_service)):
    """Resume playback"""
    await service.resume()
    return {"status": "resumed"}


@router.put("/tempo")
async def set_tempo(request: SetTempoRequest, service: SequencerService = Depends(get_sequencer_service)):
    """Set playback tempo"""
    service.set_tempo(request.tempo)
    return {"status": "updated", "tempo": request.tempo}


@router.put("/seek")
async def seek_position(request: SeekRequest, service: SequencerService = Depends(get_sequencer_service)):
    """Seek to position"""
    service.seek(request.position)
    return {"status": "seeked", "position": request.position}


@router.get("/state", response_model=PlaybackStateResponse)
async def get_playback_state(service: SequencerService = Depends(get_sequencer_service)):
    """Get current playback state"""
    state = service.get_playback_state()
    return PlaybackStateResponse(**state)

