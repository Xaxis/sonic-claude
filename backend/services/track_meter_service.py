"""
Track Meter Service - Handles per-track metering data

This service:
- Registers callback with engine manager for /track_meter OSC messages
- Converts raw meter values to dB
- Forwards formatted meter data to WebSocket manager
"""
import logging
import asyncio
import numpy as np
from typing import Optional, Callable, Dict

from backend.core.engine_manager import AudioEngineManager

logger = logging.getLogger(__name__)


class TrackMeterService:
    """
    Manages per-track meter data from trackMixer synths
    """

    def __init__(self, engine_manager: AudioEngineManager, mixer_channel_service=None) -> None:
        """
        Initialize track meter service

        Args:
            engine_manager: Audio engine manager for OSC communication
            mixer_channel_service: Mixer channel service for track ID mapping (optional, set later)
        """
        self.engine_manager = engine_manager
        self.mixer_channel_service = mixer_channel_service

        # Callback for sending data to frontend
        self.on_meter_update: Optional[Callable] = None

        # Register callback with engine manager
        engine_manager.on_track_meter_data = self._handle_track_meter_data

        logger.info("🎚️ Track meter service initialized")

    def _handle_track_meter_data(self, meter_data: Dict) -> None:
        """
        Handle per-track meter data from sclang

        Args:
            meter_data: Dictionary containing track_id (numeric index), peak_left, peak_right, rms_left, rms_right
        """
        if not self.on_meter_update:
            return

        try:
            # Convert numeric track index to track ID string
            track_index = int(meter_data["track_id"])
            track_id = None

            if self.mixer_channel_service:
                track_id = self.mixer_channel_service.get_track_id_from_index(track_index)

            if track_id is None:
                # Fallback: use the numeric index as a string
                track_id = str(track_index)
                logger.warning(f"⚠️ Could not map track index {track_index} to track ID, using index as fallback")

            # Convert to dB
            peak_l_db = 20 * np.log10(max(meter_data["peak_left"], 1e-10))
            peak_r_db = 20 * np.log10(max(meter_data["peak_right"], 1e-10))
            rms_l_db = 20 * np.log10(max(meter_data["rms_left"], 1e-10))
            rms_r_db = 20 * np.log10(max(meter_data["rms_right"], 1e-10))

            # Send to frontend (async)
            # Frontend expects: {type: "meters", track_id: string, peak_left, peak_right, rms_left, rms_right}
            asyncio.create_task(self.on_meter_update({
                "type": "meters",
                "track_id": track_id,
                "peak_left": peak_l_db,
                "peak_right": peak_r_db,
                "rms_left": rms_l_db,
                "rms_right": rms_r_db
            }))

            logger.debug(f"📊 Track {track_id} (index {track_index}) meters: L={peak_l_db:.1f}dB R={peak_r_db:.1f}dB")

        except Exception as e:
            logger.error(f"❌ Error processing track meter data: {e}")

