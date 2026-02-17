"""
WebSocket Routes - Real-time audio data streaming

Provides WebSocket endpoints for streaming audio visualization data
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from backend.core.dependencies import get_ws_manager
from backend.services.websocket_manager import WebSocketManager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/spectrum")
async def websocket_spectrum(
    websocket: WebSocket,
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """WebSocket endpoint for spectrum data"""
    await ws_manager.connect_spectrum(websocket)
    try:
        while True:
            # Keep connection alive, just receive pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_spectrum(websocket)


@router.websocket("/waveform")
async def websocket_waveform(
    websocket: WebSocket,
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """WebSocket endpoint for waveform data"""
    await ws_manager.connect_waveform(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_waveform(websocket)


@router.websocket("/meters")
async def websocket_meters(
    websocket: WebSocket,
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """WebSocket endpoint for meter data"""
    await ws_manager.connect_meters(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_meters(websocket)


@router.websocket("/transport")
async def websocket_transport(
    websocket: WebSocket,
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """WebSocket endpoint for transport data"""
    await ws_manager.connect_transport(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_transport(websocket)

