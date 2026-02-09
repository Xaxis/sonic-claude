"""
Audio engine control API routes
"""
from fastapi import APIRouter, HTTPException, Depends
from ..core.engine_manager import AudioEngineManager
from ..models.engine import EngineStatus
from backend.core import get_audio_engine
from .synthesis import router as synthesis_router
from .effects import router as effects_router
from .mixer import router as mixer_router
from .sequencer import router as sequencer_router

router = APIRouter(prefix="/audio-engine", tags=["audio-engine"])

# Include sub-routers
router.include_router(synthesis_router)
router.include_router(effects_router)
router.include_router(mixer_router)
router.include_router(sequencer_router)


@router.post("/start")
async def start_engine(engine: AudioEngineManager = Depends(get_audio_engine)):
    """Start the audio engine"""
    success = await engine.start()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start engine")

    return {"status": "started"}


@router.post("/stop")
async def stop_engine(engine: AudioEngineManager = Depends(get_audio_engine)):
    """Stop the audio engine"""
    await engine.stop()
    return {"status": "stopped"}


@router.post("/restart")
async def restart_engine(engine: AudioEngineManager = Depends(get_audio_engine)):
    """Restart the audio engine"""
    success = await engine.restart()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to restart engine")

    return {"status": "restarted"}


@router.get("/status", response_model=EngineStatus)
async def get_engine_status(engine: AudioEngineManager = Depends(get_audio_engine)):
    """Get current engine status"""
    return engine.get_status()

