"""
WebSocket Manager Service - Broadcasts audio data to connected clients

Manages WebSocket connections and broadcasts real-time audio data
"""
import logging
import json
from typing import Set, Dict, Any, Callable
from fastapi import WebSocket

from backend.models.types import SpectrumData, WaveformData, MeterData, TransportData

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts audio data
    
    Separate connections for:
    - /api/ws/spectrum: FFT spectrum data
    - /api/ws/waveform: Time-domain waveform data
    - /api/ws/meters: Peak/RMS meter data
    - /api/ws/transport: Transport state (play/stop/tempo)
    """
    
    # Client type metadata
    CLIENT_TYPES = {
        "spectrum": {"emoji": "📊", "name": "Spectrum"},
        "waveform": {"emoji": "📈", "name": "Waveform"},
        "meters": {"emoji": "📏", "name": "Meters"},
        "transport": {"emoji": "⏯️", "name": "Transport"},
    }
    
    def __init__(self) -> None:
        """Initialize WebSocket manager with empty client sets"""
        self.spectrum_clients: Set[WebSocket] = set()
        self.waveform_clients: Set[WebSocket] = set()
        self.meter_clients: Set[WebSocket] = set()
        self.transport_clients: Set[WebSocket] = set()
        
        # Map client types to their sets
        self._client_sets: Dict[str, Set[WebSocket]] = {
            "spectrum": self.spectrum_clients,
            "waveform": self.waveform_clients,
            "meters": self.meter_clients,
            "transport": self.transport_clients,
        }
    
    async def _connect_client(self, websocket: WebSocket, client_type: str) -> None:
        """
        Generic method to connect a WebSocket client
        
        Args:
            websocket: WebSocket connection to add
            client_type: Type of client (spectrum, waveform, meters, transport)
        """
        await websocket.accept()
        self._client_sets[client_type].add(websocket)
        meta = self.CLIENT_TYPES[client_type]
        logger.info(f"{meta['emoji']} {meta['name']} client connected (total: {len(self._client_sets[client_type])})")
    
    def _disconnect_client(self, websocket: WebSocket, client_type: str) -> None:
        """
        Generic method to disconnect a WebSocket client
        
        Args:
            websocket: WebSocket connection to remove
            client_type: Type of client (spectrum, waveform, meters, transport)
        """
        self._client_sets[client_type].discard(websocket)
        meta = self.CLIENT_TYPES[client_type]
        logger.info(f"{meta['emoji']} {meta['name']} client disconnected (total: {len(self._client_sets[client_type])})")
    
    async def _broadcast_to_clients(
        self, 
        data: Dict[str, Any], 
        client_type: str,
        debug_log: bool = False
    ) -> None:
        """
        Generic method to broadcast data to all connected clients of a type
        
        Args:
            data: Data to broadcast
            client_type: Type of clients to broadcast to
            debug_log: Whether to log debug information
        """
        clients = self._client_sets[client_type]
        
        if not clients:
            if debug_log:
                meta = self.CLIENT_TYPES[client_type]
                logger.debug(f"⚠️ No {meta['name'].lower()} clients connected, skipping broadcast")
            return
        
        message = json.dumps(data)
        disconnected = set()
        
        if debug_log:
            meta = self.CLIENT_TYPES[client_type]
            logger.debug(f"📡 Broadcasting {meta['name'].lower()} to {len(clients)} clients")
        
        # Create a copy of the set to avoid "Set changed size during iteration" error
        for client in list(clients):
            try:
                await client.send_text(message)
            except RuntimeError as e:
                # WebSocket already closed - silently disconnect
                if "websocket.close" in str(e) or "already completed" in str(e):
                    disconnected.add(client)
                else:
                    meta = self.CLIENT_TYPES[client_type]
                    logger.error(f"❌ Error sending to {meta['name'].lower()} client: {e}")
                    disconnected.add(client)
            except Exception as e:
                meta = self.CLIENT_TYPES[client_type]
                logger.error(f"❌ Error sending to {meta['name'].lower()} client: {e}")
                disconnected.add(client)
        
        # Remove disconnected clients
        for client in disconnected:
            self._disconnect_client(client, client_type)
    
    # Public API - Connect methods
    async def connect_spectrum(self, websocket: WebSocket) -> None:
        """Connect a spectrum WebSocket client"""
        await self._connect_client(websocket, "spectrum")
    
    async def connect_waveform(self, websocket: WebSocket) -> None:
        """Connect a waveform WebSocket client"""
        await self._connect_client(websocket, "waveform")
    
    async def connect_meters(self, websocket: WebSocket) -> None:
        """Connect a meters WebSocket client"""
        await self._connect_client(websocket, "meters")
    
    async def connect_transport(self, websocket: WebSocket) -> None:
        """Connect a transport WebSocket client"""
        await self._connect_client(websocket, "transport")
    
    # Public API - Disconnect methods
    def disconnect_spectrum(self, websocket: WebSocket) -> None:
        """Disconnect a spectrum WebSocket client"""
        self._disconnect_client(websocket, "spectrum")

    def disconnect_waveform(self, websocket: WebSocket) -> None:
        """Disconnect a waveform WebSocket client"""
        self._disconnect_client(websocket, "waveform")

    def disconnect_meters(self, websocket: WebSocket) -> None:
        """Disconnect a meters WebSocket client"""
        self._disconnect_client(websocket, "meters")

    def disconnect_transport(self, websocket: WebSocket) -> None:
        """Disconnect a transport WebSocket client"""
        self._disconnect_client(websocket, "transport")

    # Public API - Broadcast methods
    async def broadcast_spectrum(self, data: SpectrumData) -> None:
        """
        Broadcast spectrum data to all connected clients

        Args:
            data: Spectrum data to broadcast
        """
        await self._broadcast_to_clients(data, "spectrum")

    async def broadcast_waveform(self, data: WaveformData) -> None:
        """
        Broadcast waveform data to all connected clients

        Args:
            data: Waveform data to broadcast
        """
        await self._broadcast_to_clients(data, "waveform")

    async def broadcast_meters(self, data: MeterData) -> None:
        """
        Broadcast meter data to all connected clients

        Args:
            data: Meter data to broadcast
        """
        await self._broadcast_to_clients(data, "meters")

    async def broadcast_transport(self, data: TransportData) -> None:
        """
        Broadcast transport data to all connected clients

        Args:
            data: Transport state data to broadcast
        """
        await self._broadcast_to_clients(data, "transport", debug_log=True)

