"""
WebSocket routes for real-time data streaming
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.core import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

# Global service references (set by main.py)
_audio_analyzer = None
_ai_agent = None

def set_websocket_services(audio_analyzer, ai_agent):
    """Inject service dependencies"""
    global _audio_analyzer, _ai_agent
    _audio_analyzer = audio_analyzer
    _ai_agent = ai_agent


@router.websocket("/spectrum")
async def websocket_spectrum(websocket: WebSocket):
    """WebSocket endpoint for real-time frequency spectrum streaming"""
    await websocket.accept()
    logger.info("WebSocket client connected for spectrum data")
    
    try:
        while True:
            if _audio_analyzer:
                # Get frequency spectrum (100 bins)
                spectrum = _audio_analyzer.get_frequency_spectrum(num_bins=100)
                
                # Send to client
                await websocket.send_json({
                    "type": "spectrum",
                    "data": spectrum
                })
            else:
                # Send empty spectrum if analyzer not available
                await websocket.send_json({
                    "type": "spectrum",
                    "data": [0.0] * 100
                })
            
            # Send updates at ~60 FPS for smooth visualization
            await asyncio.sleep(1/60)
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/status")
async def websocket_status(websocket: WebSocket):
    """WebSocket endpoint for real-time AI status updates"""
    await websocket.accept()
    logger.info("WebSocket client connected for status updates")
    
    try:
        while True:
            if _ai_agent and _audio_analyzer:
                # Get current status
                status = _ai_agent.get_status()
                
                # Add frequency spectrum
                status["frequency_spectrum"] = _audio_analyzer.get_frequency_spectrum(num_bins=100)
                
                # Send to client
                await websocket.send_json({
                    "type": "status",
                    "data": status
                })
            else:
                # Send minimal status if services not available
                await websocket.send_json({
                    "type": "status",
                    "data": {
                        "is_running": False,
                        "frequency_spectrum": [0.0] * 100
                    }
                })
            
            # Send updates every 500ms
            await asyncio.sleep(0.5)
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

