"""
WebSocket Routes
Real-time data streaming endpoints
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import logging

from backend.core import get_websocket_service
from backend.services.websocket_service import WebSocketService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/spectrum")
async def websocket_spectrum(
    websocket: WebSocket,
    ws_service: WebSocketService = Depends(get_websocket_service)
):
    """
    WebSocket endpoint for real-time frequency spectrum data
    Streams at 60 FPS
    """
    await ws_service.connect_spectrum(websocket)
    try:
        # Keep connection alive
        while True:
            # Wait for client messages (ping/pong)
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_service.disconnect_spectrum(websocket)
    except Exception as e:
        logger.error(f"Spectrum WebSocket error: {e}")
        await ws_service.disconnect_spectrum(websocket)


@router.websocket("/meters")
async def websocket_meters(
    websocket: WebSocket,
    ws_service: WebSocketService = Depends(get_websocket_service)
):
    """
    WebSocket endpoint for real-time audio metering data
    Streams at 30 FPS
    """
    await ws_service.connect_meters(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_service.disconnect_meters(websocket)
    except Exception as e:
        logger.error(f"Meters WebSocket error: {e}")
        await ws_service.disconnect_meters(websocket)


@router.websocket("/waveform")
async def websocket_waveform(
    websocket: WebSocket,
    ws_service: WebSocketService = Depends(get_websocket_service)
):
    """
    WebSocket endpoint for real-time waveform data
    Streams at 30 FPS
    """
    await ws_service.connect_waveform(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_service.disconnect_waveform(websocket)
    except Exception as e:
        logger.error(f"Waveform WebSocket error: {e}")
        await ws_service.disconnect_waveform(websocket)


@router.websocket("/transport")
async def websocket_transport(
    websocket: WebSocket,
    ws_service: WebSocketService = Depends(get_websocket_service)
):
    """
    WebSocket endpoint for real-time transport/playback position
    Streams at 60 FPS
    """
    await ws_service.connect_transport(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_service.disconnect_transport(websocket)
    except Exception as e:
        logger.error(f"Transport WebSocket error: {e}")
        await ws_service.disconnect_transport(websocket)


@router.websocket("/analytics")
async def websocket_analytics(
    websocket: WebSocket,
    ws_service: WebSocketService = Depends(get_websocket_service)
):
    """
    WebSocket endpoint for real-time musical analytics
    Streams at 10 FPS
    """
    await ws_service.connect_analytics(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await ws_service.disconnect_analytics(websocket)
    except Exception as e:
        logger.error(f"Analytics WebSocket error: {e}")
        await ws_service.disconnect_analytics(websocket)

