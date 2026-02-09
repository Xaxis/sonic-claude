"""
Timeline Routes
REST API and WebSocket endpoints for timeline/sequencer functionality
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Optional
import json
import asyncio
from datetime import datetime

from backend.models.timeline import (
    TimelineSequence, Track, Clip, MIDIEvent,
    CreateSequenceRequest, AddTrackRequest, AddClipRequest, UpdateClipRequest,
    TimelineUpdate
)

router = APIRouter(prefix="/timeline", tags=["timeline"])

# In-memory storage (replace with database in production)
sequences: Dict[str, TimelineSequence] = {}
active_websockets: List[WebSocket] = []


def set_timeline_services():
    """Set service dependencies (placeholder for future audio engine)"""
    pass


@router.post("/sequences", response_model=TimelineSequence)
async def create_sequence(request: CreateSequenceRequest):
    """Create a new timeline sequence"""
    sequence_id = f"seq-{int(datetime.now().timestamp() * 1000)}"
    
    # Parse time signature
    parts = request.time_signature.split("/")
    numerator = int(parts[0]) if len(parts) > 0 else 4
    denominator = int(parts[1]) if len(parts) > 1 else 4
    
    sequence = TimelineSequence(
        id=sequence_id,
        name=request.name,
        created_at=datetime.now().timestamp(),
        updated_at=datetime.now().timestamp(),
        tracks=[],
        tempo=request.tempo,
        time_signature_numerator=numerator,
        time_signature_denominator=denominator,
        key="C",
        scale="major",
        zoom_level=1.0,
        scroll_position=0.0,
        is_playing=False,
        is_recording=False,
        playhead_position=0.0,
        loop_enabled=False,
        loop_start=0.0,
        loop_end=16.0,
    )
    
    sequences[sequence_id] = sequence
    await broadcast_update("sequence_created", sequence_id, {"sequence": sequence.dict()})
    
    return sequence


@router.get("/sequences/{sequence_id}", response_model=TimelineSequence)
async def get_sequence(sequence_id: str):
    """Get a timeline sequence by ID"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return sequences[sequence_id]


@router.get("/sequences", response_model=List[TimelineSequence])
async def list_sequences():
    """List all timeline sequences"""
    return list(sequences.values())


@router.put("/sequences/{sequence_id}", response_model=TimelineSequence)
async def update_sequence(sequence_id: str, sequence: TimelineSequence):
    """Update a timeline sequence"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    sequence.updated_at = datetime.now().timestamp()
    sequences[sequence_id] = sequence
    await broadcast_update("sequence_updated", sequence_id, {"sequence": sequence.dict()})
    
    return sequence


@router.delete("/sequences/{sequence_id}")
async def delete_sequence(sequence_id: str):
    """Delete a timeline sequence"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    del sequences[sequence_id]
    await broadcast_update("sequence_deleted", sequence_id, {})
    
    return {"status": "deleted", "sequence_id": sequence_id}


@router.post("/sequences/{sequence_id}/tracks", response_model=Track)
async def add_track(sequence_id: str, request: AddTrackRequest):
    """Add a track to a sequence"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    sequence = sequences[sequence_id]
    track_id = f"track-{int(datetime.now().timestamp() * 1000)}"
    
    track = Track(
        id=track_id,
        name=request.name,
        color=f"hsl({len(sequence.tracks) * 45 % 360}, 70%, 50%)",
        height=100,
        clips=[],
        instrument=request.instrument,
        midi_channel=len(sequence.tracks),
        volume=1.0,
        pan=0.0,
        is_muted=False,
        is_solo=False,
        is_armed=False,
    )
    
    sequence.tracks.append(track)
    sequence.updated_at = datetime.now().timestamp()
    sequences[sequence_id] = sequence
    
    await broadcast_update("track_added", sequence_id, {"track": track.dict()})
    
    return track


@router.post("/sequences/{sequence_id}/clips", response_model=Clip)
async def add_clip(sequence_id: str, request: AddClipRequest):
    """Add a clip to a track"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    sequence = sequences[sequence_id]
    track = next((t for t in sequence.tracks if t.id == request.track_id), None)
    
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    clip_id = f"clip-{int(datetime.now().timestamp() * 1000)}"
    
    clip = Clip(
        id=clip_id,
        name=request.name,
        type="midi",
        track_id=request.track_id,
        start_time=request.start_time,
        duration=request.duration,
        color="#3b82f6",
        midi_events=request.midi_events,
        audio_offset=0.0,
        is_muted=False,
        is_looped=False,
        loop_count=1,
    )
    
    track.clips.append(clip)
    sequence.updated_at = datetime.now().timestamp()
    sequences[sequence_id] = sequence

    await broadcast_update("clip_added", sequence_id, {"clip": clip.dict()})

    return clip


@router.put("/sequences/{sequence_id}/clips/{clip_id}", response_model=Clip)
async def update_clip(sequence_id: str, clip_id: str, request: UpdateClipRequest):
    """Update a clip"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence = sequences[sequence_id]
    clip = None

    for track in sequence.tracks:
        for c in track.clips:
            if c.id == clip_id:
                clip = c
                break
        if clip:
            break

    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    # Update clip properties
    if request.start_time is not None:
        clip.start_time = request.start_time
    if request.duration is not None:
        clip.duration = request.duration
    if request.midi_events is not None:
        clip.midi_events = request.midi_events
    if request.is_muted is not None:
        clip.is_muted = request.is_muted

    sequence.updated_at = datetime.now().timestamp()
    sequences[sequence_id] = sequence

    await broadcast_update("clip_updated", sequence_id, {"clip": clip.dict()})

    return clip


@router.delete("/sequences/{sequence_id}/clips/{clip_id}")
async def delete_clip(sequence_id: str, clip_id: str):
    """Delete a clip"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence = sequences[sequence_id]

    for track in sequence.tracks:
        track.clips = [c for c in track.clips if c.id != clip_id]

    sequence.updated_at = datetime.now().timestamp()
    sequences[sequence_id] = sequence

    await broadcast_update("clip_deleted", sequence_id, {"clip_id": clip_id})

    return {"status": "deleted", "clip_id": clip_id}


@router.post("/sequences/{sequence_id}/play")
async def play_sequence(sequence_id: str):
    """Play timeline sequence (will be implemented with new audio engine)"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence = sequences[sequence_id]

    # TODO: Send to new audio engine for playback
    # For now, just update state
    sequence.is_playing = True

    # Broadcast update
    await broadcast_update("sequence_playing", sequence_id, {"is_playing": True})

    return {"status": "playing", "message": "Audio engine playback not yet implemented"}


@router.post("/sequences/{sequence_id}/stop")
async def stop_sequence(sequence_id: str):
    """Stop playing a sequence"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence = sequences[sequence_id]
    sequence.is_playing = False

    # TODO: Send stop command to new audio engine

    # Broadcast update
    await broadcast_update("sequence_stopped", sequence_id, {"is_playing": False})

    return {"status": "stopped"}


@router.post("/sequences/{sequence_id}/from-transcription")
async def populate_from_transcription(sequence_id: str, transcription_result: dict):
    """Populate timeline from live transcription results"""
    if sequence_id not in sequences:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence = sequences[sequence_id]

    # Convert transcription to timeline tracks
    from backend.models.transcription import LiveTranscriptionResult
    transcription = LiveTranscriptionResult(**transcription_result)

    updated_sequence = converter.convert_transcription_to_timeline(transcription, sequence)
    sequences[sequence_id] = updated_sequence

    # Broadcast update
    await broadcast_update("sequence_updated", sequence_id, updated_sequence.dict())

    return updated_sequence


@router.websocket("/ws/{sequence_id}")
async def timeline_websocket(websocket: WebSocket, sequence_id: str):
    """WebSocket for real-time timeline updates"""
    await websocket.accept()
    active_websockets.append(websocket)

    try:
        # Send initial sequence state
        if sequence_id in sequences:
            await websocket.send_json({
                "type": "initial_state",
                "sequence": sequences[sequence_id].dict()
            })

        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle playhead updates
            if message.get("type") == "playhead_update":
                if sequence_id in sequences:
                    sequences[sequence_id].playhead_position = message.get("position", 0.0)
                    await broadcast_update("playhead_moved", sequence_id, {
                        "position": message.get("position", 0.0)
                    })

            # Handle play/pause
            elif message.get("type") == "transport_change":
                if sequence_id in sequences:
                    sequences[sequence_id].is_playing = message.get("is_playing", False)
                    await broadcast_update("transport_changed", sequence_id, {
                        "is_playing": message.get("is_playing", False)
                    })

    except WebSocketDisconnect:
        active_websockets.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_websockets:
            active_websockets.remove(websocket)


async def broadcast_update(update_type: str, sequence_id: str, data: dict):
    """Broadcast update to all connected WebSocket clients"""
    update = TimelineUpdate(
        type=update_type,
        timestamp=datetime.now().timestamp(),
        sequence_id=sequence_id,
        data=data
    )

    message = json.dumps(update.dict())

    # Send to all active websockets
    disconnected = []
    for ws in active_websockets:
        try:
            await ws.send_text(message)
        except Exception:
            disconnected.append(ws)

    # Clean up disconnected websockets
    for ws in disconnected:
        if ws in active_websockets:
            active_websockets.remove(ws)

