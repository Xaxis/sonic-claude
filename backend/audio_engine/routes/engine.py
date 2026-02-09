"""
Audio engine control API routes
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from ..core.engine_manager import AudioEngineManager
from ..models.engine import EngineStatus
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

# Global engine instance (will be set by main.py)
_engine: Optional[AudioEngineManager] = None


def set_engine(engine: AudioEngineManager):
    """Set the global engine instance"""
    global _engine
    _engine = engine


@router.post("/start")
async def start_engine():
    """Start the audio engine"""
    if _engine is None:
        raise HTTPException(status_code=500, detail="Engine not initialized")
    
    success = await _engine.start()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start engine")
    
    return {"status": "started"}


@router.post("/stop")
async def stop_engine():
    """Stop the audio engine"""
    if _engine is None:
        raise HTTPException(status_code=500, detail="Engine not initialized")
    
    await _engine.stop()
    return {"status": "stopped"}


@router.post("/restart")
async def restart_engine():
    """Restart the audio engine"""
    if _engine is None:
        raise HTTPException(status_code=500, detail="Engine not initialized")
    
    success = await _engine.restart()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to restart engine")
    
    return {"status": "restarted"}


@router.get("/status", response_model=EngineStatus)
async def get_engine_status():
    """Get current engine status"""
    if _engine is None:
        raise HTTPException(status_code=500, detail="Engine not initialized")
    
    return _engine.get_status()

