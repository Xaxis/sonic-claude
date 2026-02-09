"""
Live Transcription API Routes
Real-time audio-to-Sonic-Pi transcription endpoints
"""
import asyncio
import time
import json
import numpy as np
import pyaudio
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Optional, Dict

from backend.core import get_logger
from backend.models.transcription import (
    TranscriptionRequest, TranscriptionSettings, LiveTranscriptionResult,
    LiveTranscriptionState, TranscriptionStatus, StemType, StreamUpdate
)
from backend.models.sample import AudioDevice

logger = get_logger(__name__)

router = APIRouter(prefix="/transcribe", tags=["transcription"])

# Global service instances (injected from main.py)
_transcription_engine = None
_sample_recorder = None  # For audio device enumeration

def set_transcription_services(transcription_engine, sample_recorder):
    """Inject service dependencies"""
    global _transcription_engine, _sample_recorder
    _transcription_engine = transcription_engine
    _sample_recorder = sample_recorder
    logger.info("✅ Transcription services injected into routes")


# Active transcription state
_active_transcription: Optional[dict] = None
_transcription_task: Optional[asyncio.Task] = None
_transcription_result: Optional[LiveTranscriptionResult] = None


@router.get("/status", response_model=LiveTranscriptionState)
async def get_transcription_status():
    """Get current transcription status"""
    try:
        if not _transcription_engine:
            raise HTTPException(status_code=503, detail="Transcription engine not initialized")

        if _active_transcription:
            state = LiveTranscriptionState(
                status=_transcription_engine.current_status,
                device_index=_active_transcription.get("device_index"),
                device_name=_active_transcription.get("device_name"),
                buffer_duration=_active_transcription.get("buffer_duration", 8.0),
                stems_enabled=_active_transcription.get("stems_enabled", {}),
                auto_send_to_sonic_pi=_active_transcription.get("auto_send", False)
            )
            # Include result if available
            if _transcription_result:
                state.result = _transcription_result
            return state
        else:
            return LiveTranscriptionState(
                status=TranscriptionStatus.IDLE,
                buffer_duration=8.0,
                stems_enabled={
                    StemType.DRUMS: True,
                    StemType.BASS: True,
                    StemType.VOCALS: True,
                    StemType.OTHER: True,
                }
            )

    except Exception as e:
        logger.error(f"Error getting transcription status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _capture_and_transcribe_task(
    device_index: int,
    buffer_duration: float,
    stems_enabled: Dict[StemType, bool],
    settings: TranscriptionSettings
):
    """Background task to capture audio and run transcription"""
    global _transcription_result, _active_transcription

    p = None
    audio_stream = None

    try:
        logger.info(f"🎤 Starting audio capture on device {device_index}")
        _transcription_engine.current_status = TranscriptionStatus.LISTENING

        # Initialize PyAudio
        p = pyaudio.PyAudio()

        # Get device info
        device_info = p.get_device_info_by_index(device_index)
        sample_rate = int(device_info.get("defaultSampleRate", 48000))
        channels = min(int(device_info.get("maxInputChannels", 1)), 2)

        # Open audio stream
        audio_stream = p.open(
            format=pyaudio.paFloat32,
            channels=channels,
            rate=sample_rate,
            input=True,
            input_device_index=device_index,
            frames_per_buffer=1024
        )

        # Calculate buffer size
        buffer_frames = int(buffer_duration * sample_rate)
        audio_buffer = []

        logger.info(f"📊 Capturing {buffer_duration}s of audio...")

        # Capture audio
        while len(audio_buffer) < buffer_frames:
            data = audio_stream.read(1024, exception_on_overflow=False)
            audio_data = np.frombuffer(data, dtype=np.float32)
            audio_buffer.extend(audio_data)

        # Convert to numpy array
        audio_array = np.array(audio_buffer[:buffer_frames])

        # Convert stereo to mono if needed
        if channels == 2:
            audio_array = audio_array.reshape(-1, 2).mean(axis=1)

        logger.info(f"✅ Audio captured, starting transcription...")

        # Run transcription
        result = await _transcription_engine.transcribe_audio_buffer(
            audio_array,
            sample_rate,
            stems_enabled,
            settings
        )

        # Store result
        _transcription_result = result

        logger.info(f"✅ Transcription complete!")

    except Exception as e:
        logger.error(f"❌ Transcription task failed: {e}")
        _transcription_engine.current_status = TranscriptionStatus.ERROR
        _transcription_result = LiveTranscriptionResult(
            status=TranscriptionStatus.ERROR,
            stems=[],
            sonic_pi_code=[],
            combined_code="",
            processing_time=0.0,
            error_message=str(e)
        )
    finally:
        # Cleanup
        if audio_stream:
            audio_stream.stop_stream()
            audio_stream.close()
        if p:
            p.terminate()

        # DON'T clear active transcription - keep it so status endpoint returns result
        # _active_transcription = None


@router.post("/start")
async def start_transcription(request: TranscriptionRequest):
    """Start live transcription"""
    global _active_transcription, _transcription_task, _transcription_result

    try:
        if not _transcription_engine:
            raise HTTPException(status_code=503, detail="Transcription engine not initialized")

        if _active_transcription:
            raise HTTPException(status_code=400, detail="Transcription already running")

        # Get device info
        device_name = "Default Device"
        if request.device_index is not None and _sample_recorder:
            devices = _sample_recorder.list_audio_devices()
            device = next((d for d in devices if d.index == request.device_index), None)
            if device:
                device_name = device.name

        # Parse stems_enabled
        stems_enabled = {}
        if request.stems_enabled:
            for stem_name, enabled in request.stems_enabled.items():
                try:
                    stem_type = StemType(stem_name)
                    stems_enabled[stem_type] = enabled
                except ValueError:
                    pass
        else:
            # Default: all stems enabled
            stems_enabled = {
                StemType.DRUMS: True,
                StemType.BASS: True,
                StemType.VOCALS: True,
                StemType.OTHER: True,
            }

        # Store active transcription state
        _active_transcription = {
            "device_index": request.device_index,
            "device_name": device_name,
            "buffer_duration": request.buffer_duration,
            "stems_enabled": stems_enabled,
            "auto_send": request.auto_send,
            "start_time": time.time()
        }

        # Clear previous result
        _transcription_result = None

        # Create transcription settings
        settings = TranscriptionSettings(
            sample_rate=48000,
            chunk_duration=request.buffer_duration,
            enable_source_separation=True,
            enable_beat_detection=True,
            enable_key_detection=True
        )

        # Start background task
        _transcription_task = asyncio.create_task(
            _capture_and_transcribe_task(
                request.device_index or 0,
                request.buffer_duration,
                stems_enabled,
                settings
            )
        )

        logger.info(f"✅ Transcription started on device: {device_name}")

        return {
            "status": "started",
            "device_name": device_name,
            "buffer_duration": request.buffer_duration
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stop")
async def stop_transcription():
    """Stop live transcription"""
    global _active_transcription, _transcription_task

    try:
        if not _active_transcription:
            raise HTTPException(status_code=400, detail="No active transcription")

        # Cancel background task
        if _transcription_task and not _transcription_task.done():
            _transcription_task.cancel()
            try:
                await _transcription_task
            except asyncio.CancelledError:
                pass

        _active_transcription = None
        _transcription_task = None
        if _transcription_engine:
            _transcription_engine.current_status = TranscriptionStatus.IDLE

        logger.info("✅ Transcription stopped")

        return {"status": "stopped"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping transcription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def transcription_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time transcription streaming
    Captures audio, transcribes, and streams results
    """
    await websocket.accept()
    logger.info("🔌 WebSocket connected for live transcription")

    audio_stream = None
    p = None

    try:
        # Wait for start command
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("action") == "start":
                # Get parameters
                device_index = message.get("device_index", 0)
                buffer_duration = message.get("buffer_duration", 8.0)
                stems_enabled_dict = message.get("stems_enabled", {})
                auto_send = message.get("auto_send", False)

                # Parse stems
                stems_enabled = {}
                for stem_name, enabled in stems_enabled_dict.items():
                    try:
                        stem_type = StemType(stem_name)
                        stems_enabled[stem_type] = enabled
                    except ValueError:
                        pass

                # Initialize PyAudio
                p = pyaudio.PyAudio()

                # Get device info
                device_info = p.get_device_info_by_index(device_index)
                sample_rate = int(device_info['defaultSampleRate'])
                channels = 1  # Mono

                logger.info(f"🎤 Starting audio capture: device={device_index}, sr={sample_rate}")

                # Open audio stream
                audio_stream = p.open(
                    format=pyaudio.paFloat32,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=1024
                )

                # Send status update
                await websocket.send_json({
                    "type": "status",
                    "timestamp": time.time(),
                    "data": {"status": "listening", "sample_rate": sample_rate}
                })

                # Audio capture loop
                buffer_size = int(sample_rate * buffer_duration)
                audio_buffer = []

                while True:
                    # Check for stop command
                    try:
                        stop_data = await asyncio.wait_for(
                            websocket.receive_text(), timeout=0.01
                        )
                        stop_msg = json.loads(stop_data)
                        if stop_msg.get("action") == "stop":
                            logger.info("⏹️ Stop command received")
                            break
                    except asyncio.TimeoutError:
                        pass

                    # Read audio chunk
                    try:
                        audio_chunk = audio_stream.read(1024, exception_on_overflow=False)
                        audio_data = np.frombuffer(audio_chunk, dtype=np.float32)
                        audio_buffer.extend(audio_data)

                        # Send progress update
                        progress = min(len(audio_buffer) / buffer_size, 1.0)
                        if len(audio_buffer) % (sample_rate // 4) == 0:  # Every 0.25s
                            await websocket.send_json({
                                "type": "progress",
                                "timestamp": time.time(),
                                "data": {"progress": progress, "buffer_size": len(audio_buffer)}
                            })

                        # When buffer is full, transcribe
                        if len(audio_buffer) >= buffer_size:
                            logger.info(f"🎵 Buffer full ({len(audio_buffer)} samples), transcribing...")

                            # Send analyzing status
                            await websocket.send_json({
                                "type": "status",
                                "timestamp": time.time(),
                                "data": {"status": "analyzing"}
                            })

                            # Convert to numpy array
                            audio_array = np.array(audio_buffer[:buffer_size])

                            # Create settings
                            settings = TranscriptionSettings(
                                buffer_duration=buffer_duration
                            )

                            # Transcribe
                            result = await _transcription_engine.transcribe_audio_buffer(
                                audio_array,
                                sample_rate,
                                stems_enabled,
                                settings
                            )

                            # Send result
                            await websocket.send_json({
                                "type": "result",
                                "timestamp": time.time(),
                                "data": {
                                    "status": result.status.value,
                                    "stems": [
                                        {
                                            "stem_type": s.stem_type.value,
                                            "tempo": s.tempo,
                                            "key": s.key,
                                            "note_count": len(s.notes),
                                            "beat_count": len(s.beats),
                                            "energy": s.energy
                                        }
                                        for s in result.stems
                                    ],
                                    "sonic_pi_code": [
                                        {
                                            "stem_type": c.stem_type.value,
                                            "code": c.code,
                                            "live_loop_name": c.live_loop_name,
                                            "synth_name": c.synth_name
                                        }
                                        for c in result.sonic_pi_code
                                    ],
                                    "combined_code": result.combined_code,
                                    "processing_time": result.processing_time
                                }
                            })

                            # Auto-send to Sonic Pi if enabled
                            if auto_send and result.combined_code:
                                await _transcription_engine.send_to_sonic_pi(result.combined_code)
                                await websocket.send_json({
                                    "type": "status",
                                    "timestamp": time.time(),
                                    "data": {"status": "sent_to_sonic_pi"}
                                })

                            # Clear buffer and continue
                            audio_buffer = []

                            # Send ready status
                            await websocket.send_json({
                                "type": "status",
                                "timestamp": time.time(),
                                "data": {"status": "listening"}
                            })

                    except Exception as e:
                        logger.error(f"Error reading audio: {e}")
                        break

                # Clean up audio stream
                if audio_stream:
                    audio_stream.stop_stream()
                    audio_stream.close()
                    audio_stream = None

                # Send stopped status
                await websocket.send_json({
                    "type": "status",
                    "timestamp": time.time(),
                    "data": {"status": "idle"}
                })

    except WebSocketDisconnect:
        logger.info("🔌 WebSocket disconnected")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "timestamp": time.time(),
                "data": {"error": str(e)}
            })
        except:
            pass
    finally:
        # Clean up
        if audio_stream:
            try:
                audio_stream.stop_stream()
                audio_stream.close()
            except:
                pass
        if p:
            try:
                p.terminate()
            except:
                pass
        logger.info("🧹 WebSocket cleanup complete")


@router.post("/send-to-sonic-pi")
async def send_code_to_sonic_pi(code: dict):
    """Send generated code to Sonic Pi"""
    try:
        if not _transcription_engine:
            raise HTTPException(status_code=503, detail="Transcription engine not initialized")

        sonic_pi_code = code.get("code", "")
        if not sonic_pi_code:
            raise HTTPException(status_code=400, detail="No code provided")

        success = await _transcription_engine.send_to_sonic_pi(sonic_pi_code)

        if success:
            return {"status": "sent", "message": "Code sent to Sonic Pi"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send code to Sonic Pi")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending code to Sonic Pi: {e}")
        raise HTTPException(status_code=500, detail=str(e))

