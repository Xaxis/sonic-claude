"""
Mixer Service - Manages mixer channels, routing, and audio processing
"""
import logging
import uuid
from typing import Dict, List, Optional
from pathlib import Path
import json

from backend.models.mixer import (
    MixerChannel,
    MasterChannel,
    MixerState,
    CreateChannelRequest,
    UpdateChannelRequest,
    UpdateMasterRequest,
)
from backend.core.engine_manager import AudioEngineManager
from backend.services.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)


class MixerService:
    """Service for managing mixer state and SuperCollider integration"""

    def __init__(self, engine_manager: AudioEngineManager, websocket_manager: WebSocketManager, audio_analyzer=None):
        self.engine_manager = engine_manager
        self.websocket_manager = websocket_manager
        self.audio_analyzer = audio_analyzer  # Optional, set later in dependencies.py

        # Mixer state
        self.state = MixerState()

        # Storage
        self.storage_dir = Path("data/mixer")
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.storage_dir / "mixer_state.json"

        # Load saved state
        self._load_state()

        logger.info("✅ MixerService initialized")
    
    # ========================================================================
    # STATE MANAGEMENT
    # ========================================================================
    
    def _load_state(self):
        """Load mixer state from disk"""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    self.state = MixerState(**data)
                logger.info(f"✅ Loaded mixer state: {len(self.state.channels)} channels")
            except Exception as e:
                logger.error(f"❌ Failed to load mixer state: {e}")
                self.state = MixerState()
        else:
            # Create default state with master channel
            self.state = MixerState()
            self._save_state()
    
    def _save_state(self):
        """Save mixer state to disk"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.state.model_dump(), f, indent=2, default=str)
            logger.debug("💾 Saved mixer state")
        except Exception as e:
            logger.error(f"❌ Failed to save mixer state: {e}")
    
    def get_state(self) -> MixerState:
        """Get current mixer state"""
        return self.state
    
    # ========================================================================
    # CHANNEL MANAGEMENT
    # ========================================================================
    
    def create_channel(self, request: CreateChannelRequest) -> MixerChannel:
        """Create a new mixer channel"""
        channel_id = str(uuid.uuid4())
        
        # Allocate SuperCollider bus
        sc_bus_index = len(self.state.channels) + 1  # Bus 0 is master
        
        channel = MixerChannel(
            id=channel_id,
            name=request.name,
            type=request.type,
            color=request.color or "#3b82f6",
            sc_bus_index=sc_bus_index,
        )
        
        self.state.channels.append(channel)
        self._save_state()

        logger.info(f"✅ Created mixer channel: {request.name} (ID: {channel_id})")
        return channel
    
    def get_channel(self, channel_id: str) -> Optional[MixerChannel]:
        """Get channel by ID"""
        for channel in self.state.channels:
            if channel.id == channel_id:
                return channel
        return None
    
    def update_channel(self, channel_id: str, request: UpdateChannelRequest) -> MixerChannel:
        """Update mixer channel properties"""
        channel = self.get_channel(channel_id)
        if not channel:
            raise ValueError(f"Channel not found: {channel_id}")
        
        # Update properties
        if request.name is not None:
            channel.name = request.name
        if request.color is not None:
            channel.color = request.color
        if request.input_gain is not None:
            channel.input_gain = max(-60.0, min(12.0, request.input_gain))
        if request.pan is not None:
            channel.pan = max(-1.0, min(1.0, request.pan))
        if request.fader is not None:
            channel.fader = max(-60.0, min(12.0, request.fader))
        if request.mute is not None:
            channel.mute = request.mute
        if request.solo is not None:
            channel.solo = request.solo
        if request.phase_invert is not None:
            channel.phase_invert = request.phase_invert
        if request.output_bus is not None:
            channel.output_bus = request.output_bus
        
        self._save_state()

        logger.debug(f"🔄 Updated channel: {channel.name}")
        return channel

    def delete_channel(self, channel_id: str):
        """Delete a mixer channel"""
        channel = self.get_channel(channel_id)
        if not channel:
            raise ValueError(f"Channel not found: {channel_id}")

        self.state.channels = [c for c in self.state.channels if c.id != channel_id]
        self._save_state()

        logger.info(f"🗑️ Deleted channel: {channel.name}")

    def get_all_channels(self) -> List[MixerChannel]:
        """Get all mixer channels"""
        return self.state.channels

    # ========================================================================
    # MASTER CHANNEL
    # ========================================================================

    def get_master(self) -> MasterChannel:
        """Get master channel"""
        return self.state.master

    async def update_master(self, request: UpdateMasterRequest) -> MasterChannel:
        """Update master channel properties"""
        master = self.state.master

        if request.fader is not None:
            master.fader = max(-60.0, min(12.0, request.fader))
        if request.mute is not None:
            master.mute = request.mute
        if request.limiter_enabled is not None:
            master.limiter_enabled = request.limiter_enabled
        if request.limiter_threshold is not None:
            master.limiter_threshold = max(-12.0, min(0.0, request.limiter_threshold))

        self._save_state()

        # Update SuperCollider audioMonitor synth with new volume/mute
        if self.audio_analyzer and (request.fader is not None or request.mute is not None):
            await self.audio_analyzer.update_master_volume(master.fader, master.mute)

        logger.debug("🔄 Updated master channel")
        return master

    # ========================================================================
    # METERING (Updated via WebSocket from SuperCollider)
    # ========================================================================

    def update_metering(self, channel_id: str, peak_left: float, peak_right: float):
        """Update channel metering values"""
        if channel_id == "master":
            self.state.master.meter_peak_left = peak_left
            self.state.master.meter_peak_right = peak_right
        else:
            channel = self.get_channel(channel_id)
            if channel:
                channel.meter_peak_left = peak_left
                channel.meter_peak_right = peak_right

