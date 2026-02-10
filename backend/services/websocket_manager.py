"""
WebSocket Manager - Broadcasts audio data to connected clients

Manages WebSocket connections and broadcasts real-time audio data
"""
import logging
import asyncio
import json
from typing import Set, Dict, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts audio data
    
    Separate connections for:
    - /ws/spectrum: FFT spectrum data
    - /ws/waveform: Time-domain waveform data
    - /ws/meters: Peak/RMS meter data
    - /ws/transport: Transport state (play/stop/tempo)
    """
    
    def __init__(self):
        self.spectrum_clients: Set[WebSocket] = set()
        self.waveform_clients: Set[WebSocket] = set()
        self.meter_clients: Set[WebSocket] = set()
        self.transport_clients: Set[WebSocket] = set()
    
    async def connect_spectrum(self, websocket: WebSocket):
        """Connect a spectrum WebSocket client"""
        await websocket.accept()
        self.spectrum_clients.add(websocket)
        logger.info(f"📊 Spectrum client connected (total: {len(self.spectrum_clients)})")
    
    async def connect_waveform(self, websocket: WebSocket):
        """Connect a waveform WebSocket client"""
        await websocket.accept()
        self.waveform_clients.add(websocket)
        logger.info(f"📈 Waveform client connected (total: {len(self.waveform_clients)})")
    
    async def connect_meters(self, websocket: WebSocket):
        """Connect a meters WebSocket client"""
        await websocket.accept()
        self.meter_clients.add(websocket)
        logger.info(f"📏 Meters client connected (total: {len(self.meter_clients)})")
    
    async def connect_transport(self, websocket: WebSocket):
        """Connect a transport WebSocket client"""
        await websocket.accept()
        self.transport_clients.add(websocket)
        logger.info(f"⏯️  Transport client connected (total: {len(self.transport_clients)})")
    
    def disconnect_spectrum(self, websocket: WebSocket):
        """Disconnect a spectrum WebSocket client"""
        self.spectrum_clients.discard(websocket)
        logger.info(f"📊 Spectrum client disconnected (total: {len(self.spectrum_clients)})")
    
    def disconnect_waveform(self, websocket: WebSocket):
        """Disconnect a waveform WebSocket client"""
        self.waveform_clients.discard(websocket)
        logger.info(f"📈 Waveform client disconnected (total: {len(self.waveform_clients)})")
    
    def disconnect_meters(self, websocket: WebSocket):
        """Disconnect a meters WebSocket client"""
        self.meter_clients.discard(websocket)
        logger.info(f"📏 Meters client disconnected (total: {len(self.meter_clients)})")
    
    def disconnect_transport(self, websocket: WebSocket):
        """Disconnect a transport WebSocket client"""
        self.transport_clients.discard(websocket)
        logger.info(f"⏯️  Transport client disconnected (total: {len(self.transport_clients)})")
    
    async def broadcast_spectrum(self, data: Dict[str, Any]):
        """Broadcast spectrum data to all connected clients"""
        if not self.spectrum_clients:
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        for client in self.spectrum_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                logger.error(f"❌ Error sending to spectrum client: {e}")
                disconnected.add(client)
        
        # Remove disconnected clients
        for client in disconnected:
            self.disconnect_spectrum(client)
    
    async def broadcast_waveform(self, data: Dict[str, Any]):
        """Broadcast waveform data to all connected clients"""
        if not self.waveform_clients:
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        for client in self.waveform_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                logger.error(f"❌ Error sending to waveform client: {e}")
                disconnected.add(client)
        
        for client in disconnected:
            self.disconnect_waveform(client)
    
    async def broadcast_meters(self, data: Dict[str, Any]):
        """Broadcast meter data to all connected clients"""
        if not self.meter_clients:
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        for client in self.meter_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                logger.error(f"❌ Error sending to meters client: {e}")
                disconnected.add(client)
        
        for client in disconnected:
            self.disconnect_meters(client)
    
    async def broadcast_transport(self, data: Dict[str, Any]):
        """Broadcast transport data to all connected clients"""
        if not self.transport_clients:
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        for client in self.transport_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                logger.error(f"❌ Error sending to transport client: {e}")
                disconnected.add(client)
        
        for client in disconnected:
            self.disconnect_transport(client)

