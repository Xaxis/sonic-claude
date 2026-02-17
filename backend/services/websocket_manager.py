"""
WebSocket Manager - Broadcasts audio data to connected clients

Manages WebSocket connections and broadcasts real-time audio data
"""
import logging
import asyncio
import json
from typing import Set
from fastapi import WebSocket

from backend.models.types import SpectrumData, WaveformData, MeterData, TransportData

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
    
    def __init__(self) -> None:
        """Initialize WebSocket manager with empty client sets"""
        self.spectrum_clients: Set[WebSocket] = set()
        self.waveform_clients: Set[WebSocket] = set()
        self.meter_clients: Set[WebSocket] = set()
        self.transport_clients: Set[WebSocket] = set()
    
    async def connect_spectrum(self, websocket: WebSocket) -> None:
        """
        Connect a spectrum WebSocket client

        Args:
            websocket: WebSocket connection to add
        """
        await websocket.accept()
        self.spectrum_clients.add(websocket)
        logger.info(f"📊 Spectrum client connected (total: {len(self.spectrum_clients)})")

    async def connect_waveform(self, websocket: WebSocket) -> None:
        """
        Connect a waveform WebSocket client

        Args:
            websocket: WebSocket connection to add
        """
        await websocket.accept()
        self.waveform_clients.add(websocket)
        logger.info(f"📈 Waveform client connected (total: {len(self.waveform_clients)})")

    async def connect_meters(self, websocket: WebSocket) -> None:
        """
        Connect a meters WebSocket client

        Args:
            websocket: WebSocket connection to add
        """
        await websocket.accept()
        self.meter_clients.add(websocket)
        logger.info(f"📏 Meters client connected (total: {len(self.meter_clients)})")

    async def connect_transport(self, websocket: WebSocket) -> None:
        """
        Connect a transport WebSocket client

        Args:
            websocket: WebSocket connection to add
        """
        await websocket.accept()
        self.transport_clients.add(websocket)
        logger.info(f"⏯️  Transport client connected (total: {len(self.transport_clients)})")
    
    def disconnect_spectrum(self, websocket: WebSocket) -> None:
        """
        Disconnect a spectrum WebSocket client

        Args:
            websocket: WebSocket connection to remove
        """
        self.spectrum_clients.discard(websocket)
        logger.info(f"📊 Spectrum client disconnected (total: {len(self.spectrum_clients)})")

    def disconnect_waveform(self, websocket: WebSocket) -> None:
        """
        Disconnect a waveform WebSocket client

        Args:
            websocket: WebSocket connection to remove
        """
        self.waveform_clients.discard(websocket)
        logger.info(f"📈 Waveform client disconnected (total: {len(self.waveform_clients)})")

    def disconnect_meters(self, websocket: WebSocket) -> None:
        """
        Disconnect a meters WebSocket client

        Args:
            websocket: WebSocket connection to remove
        """
        self.meter_clients.discard(websocket)
        logger.info(f"📏 Meters client disconnected (total: {len(self.meter_clients)})")

    def disconnect_transport(self, websocket: WebSocket) -> None:
        """
        Disconnect a transport WebSocket client

        Args:
            websocket: WebSocket connection to remove
        """
        self.transport_clients.discard(websocket)
        logger.info(f"⏯️  Transport client disconnected (total: {len(self.transport_clients)})")
    
    async def broadcast_spectrum(self, data: SpectrumData) -> None:
        """
        Broadcast spectrum data to all connected clients

        Args:
            data: Spectrum data to broadcast
        """
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
    
    async def broadcast_waveform(self, data: WaveformData) -> None:
        """
        Broadcast waveform data to all connected clients

        Args:
            data: Waveform data to broadcast
        """
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
    
    async def broadcast_meters(self, data: MeterData) -> None:
        """
        Broadcast meter data to all connected clients

        Args:
            data: Meter data to broadcast
        """
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
    
    async def broadcast_transport(self, data: TransportData) -> None:
        """
        Broadcast transport data to all connected clients

        Args:
            data: Transport state data to broadcast
        """
        if not self.transport_clients:
            logger.debug(f"⚠️ No transport clients connected, skipping broadcast")
            return

        message = json.dumps(data)
        disconnected = set()

        logger.debug(f"📡 Broadcasting transport to {len(self.transport_clients)} clients: position={data.get('position_beats', 0):.2f}")

        for client in self.transport_clients:
            try:
                await client.send_text(message)
            except Exception as e:
                logger.error(f"❌ Error sending to transport client: {e}")
                disconnected.add(client)

        for client in disconnected:
            self.disconnect_transport(client)

