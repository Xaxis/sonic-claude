"""
Sample Recording and Analysis API Routes
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from typing import List
import numpy as np
import wave
import io
from backend.core import get_logger
from backend.models.sample import (
    Sample, SpectralFeatures, SynthesisParameters,
    RecordingRequest, RenameRequest, AnalyzeRequest, SynthesizeRequest
)

logger = get_logger(__name__)
router = APIRouter(prefix="/samples", tags=["Samples"])

# Services will be injected
_sample_recorder = None
_spectral_analyzer = None
_synthesis_agent = None


def set_sample_services(sample_recorder, spectral_analyzer, synthesis_agent):
    """Set service instances"""
    global _sample_recorder, _spectral_analyzer, _synthesis_agent
    _sample_recorder = sample_recorder
    _spectral_analyzer = spectral_analyzer
    _synthesis_agent = synthesis_agent


@router.post("/record")
async def control_recording(request: RecordingRequest):
    """Start or stop recording"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")
            
        if request.action == "start":
            sample_id = _sample_recorder.start_recording(request.name or "Untitled")
            return {
                "status": "recording",
                "sample_id": sample_id,
                "name": request.name or "Untitled"
            }
            
        elif request.action == "stop":
            if not _sample_recorder.is_recording:
                raise HTTPException(status_code=400, detail="Not currently recording")
                
            sample = _sample_recorder.stop_recording()
            return {
                "status": "stopped",
                "sample": sample.model_dump()
            }
            
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use 'start' or 'stop'")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error controlling recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Sample])
async def list_samples():
    """List all saved samples"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")
            
        samples = _sample_recorder.list_samples()
        return samples
        
    except Exception as e:
        logger.error(f"Error listing samples: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sample_id}", response_model=Sample)
async def get_sample(sample_id: str):
    """Get a specific sample"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")

        sample = _sample_recorder.get_sample(sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        return sample

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{sample_id}/audio")
async def get_sample_audio(sample_id: str):
    """Serve audio file for playback"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")

        sample = _sample_recorder.get_sample(sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        # Verify file exists
        from pathlib import Path
        file_path = Path(sample.filename)
        if not file_path.exists():
            logger.error(f"Audio file not found: {sample.filename}")
            raise HTTPException(status_code=404, detail="Audio file not found")

        logger.info(f"Serving audio file: {sample.filename}")
        return FileResponse(
            sample.filename,
            media_type="audio/wav",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving audio file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{sample_id}/rename")
async def rename_sample(sample_id: str, request: RenameRequest):
    """Rename a sample"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")
            
        sample = _sample_recorder.rename_sample(sample_id, request.new_name)
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")
            
        return {"status": "renamed", "sample": sample.model_dump()}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{sample_id}")
async def delete_sample(sample_id: str):
    """Delete a sample"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")
            
        success = _sample_recorder.delete_sample(sample_id)
        if not success:
            raise HTTPException(status_code=404, detail="Sample not found")
            
        return {"status": "deleted", "sample_id": sample_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sample_id}/analyze", response_model=SpectralFeatures)
async def analyze_sample(sample_id: str):
    """Perform spectral analysis on a sample"""
    try:
        if not _sample_recorder or not _spectral_analyzer:
            raise HTTPException(status_code=503, detail="Services not initialized")
            
        # Get sample
        sample = _sample_recorder.get_sample(sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")
            
        # Analyze
        features = _spectral_analyzer.analyze_sample(sample_id, sample.filename)
        return features
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{sample_id}/synthesize", response_model=SynthesisParameters)
async def synthesize_sample(sample_id: str):
    """Generate synthesis parameters for a sample using LLM"""
    try:
        if not _sample_recorder or not _spectral_analyzer or not _synthesis_agent:
            raise HTTPException(status_code=503, detail="Services not initialized")

        # Get sample
        sample = _sample_recorder.get_sample(sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        # Analyze first
        features = _spectral_analyzer.analyze_sample(sample_id, sample.filename)

        # Generate synthesis parameters
        params = await _synthesis_agent.generate_synthesis_parameters(features)
        return params

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error synthesizing sample: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recording/status")
async def get_recording_status():
    """Get current recording status"""
    try:
        if not _sample_recorder:
            raise HTTPException(status_code=503, detail="Sample recorder not initialized")

        return {
            "is_recording": _sample_recorder.is_recording,
            "current_sample_id": _sample_recorder.current_sample_id,
            "current_sample_name": _sample_recorder.current_sample_name
        }

    except Exception as e:
        logger.error(f"Error getting recording status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-tone")
async def get_test_tone():
    """Generate a test tone (440Hz sine wave) to verify audio playback"""
    try:
        # Generate 2 seconds of 440Hz sine wave
        sample_rate = 48000
        duration = 2.0
        frequency = 440.0

        t = np.linspace(0, duration, int(sample_rate * duration))
        audio_data = np.sin(2 * np.pi * frequency * t)

        # Convert to 16-bit PCM
        audio_data = (audio_data * 32767).astype(np.int16)

        # Create stereo (duplicate mono to both channels)
        stereo_data = np.column_stack((audio_data, audio_data))

        # Write to WAV in memory
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(stereo_data.tobytes())

        buffer.seek(0)

        return StreamingResponse(
            buffer,
            media_type="audio/wav",
            headers={
                "Content-Disposition": "inline; filename=test-tone.wav",
                "Accept-Ranges": "bytes"
            }
        )
    except Exception as e:
        logger.error(f"Error generating test tone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

