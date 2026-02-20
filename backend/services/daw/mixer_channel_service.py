"""
Mixer Channel Service - Manages mixer channel synths for tracks

Each track gets a mixer channel synth that:
- Reads audio from the track's bus
- Applies volume, pan, mute/solo
- Sends meter data (peak/RMS) via OSC
- Outputs to master bus (0)
"""
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class MixerChannelSynthManager:
    """
    Manages mixer channel synths for sequencer tracks (low-level SC integration)

    Architecture:
    - One mixer channel synth per track
    - Node IDs: 2000-2999 (reserved for mixer channels)
    - Reads from track bus, outputs to master bus
    - Sends per-track meter data with track_id
    """

    def __init__(self, engine_manager, bus_manager):
        self.engine_manager = engine_manager
        self.bus_manager = bus_manager
        self.next_mixer_node_id = 2000  # Reserved range for mixer channels
        self.mixer_channels: Dict[str, int] = {}  # track_id -> node_id mapping
        self.track_id_to_index: Dict[str, int] = {}  # track_id -> numeric index mapping
        self.next_track_index = 0  # Incrementing numeric index for tracks

    async def create_mixer_channel(
        self,
        track_id: str,
        volume: float = 1.0,
        pan: float = 0.0,
        mute: bool = False,
        solo: bool = False
    ) -> int:
        """
        Create a mixer channel synth for a track

        Args:
            track_id: Sequencer track ID
            volume: Track volume (0.0-2.0, 1.0 = unity)
            pan: Track pan (-1.0 to 1.0)
            mute: Mute state
            solo: Solo state

        Returns:
            Node ID of the mixer channel synth
        """
        try:
            # Get or allocate bus for this track
            bus_id = self.bus_manager.get_track_bus(track_id)
            if bus_id is None:
                bus_id = self.bus_manager.allocate_track_bus(track_id)

            # Get or allocate numeric index for this track
            # SuperCollider can't handle string parameters, so we use a numeric index
            if track_id not in self.track_id_to_index:
                self.track_id_to_index[track_id] = self.next_track_index
                self.next_track_index += 1
            track_index = self.track_id_to_index[track_id]

            # Allocate node ID for mixer channel
            node_id = self.next_mixer_node_id
            self.next_mixer_node_id += 1

            # Create mixer channel synth
            # Target group 2 (effects/mixer group, after synths)
            self.engine_manager.send_message(
                "/s_new",
                "trackMixer",  # SynthDef name
                node_id,
                1,  # Add action: addToTail
                2,  # Target group: mixer group
                "inBus", bus_id,
                "outBus", 0,  # Master output
                "volume", volume,
                "pan", pan,
                "mute", 1 if mute else 0,
                "solo", 1 if solo else 0,
                "trackId", track_index,  # Pass numeric track index (not string UUID!)
                "sendRate", 30  # 30 Hz meter update rate
            )

            self.mixer_channels[track_id] = node_id
            logger.info(f"🎚️ Created mixer channel for track {track_id} (node {node_id}, bus {bus_id}, track_index {track_index})")

            return node_id

        except Exception as e:
            logger.error(f"❌ Failed to create mixer channel for track {track_id}: {e}")
            raise

    async def update_mixer_channel(
        self,
        track_id: str,
        volume: Optional[float] = None,
        pan: Optional[float] = None,
        mute: Optional[bool] = None,
        solo: Optional[bool] = None
    ) -> None:
        """
        Update mixer channel parameters

        Args:
            track_id: Sequencer track ID
            volume: New volume (optional)
            pan: New pan (optional)
            mute: New mute state (optional)
            solo: New solo state (optional)
        """
        try:
            node_id = self.mixer_channels.get(track_id)
            if node_id is None:
                logger.warning(f"⚠️ No mixer channel found for track {track_id}")
                return

            # Send parameter updates
            if volume is not None:
                self.engine_manager.send_message("/n_set", node_id, "volume", volume)
            if pan is not None:
                self.engine_manager.send_message("/n_set", node_id, "pan", pan)
            if mute is not None:
                self.engine_manager.send_message("/n_set", node_id, "mute", 1 if mute else 0)
            if solo is not None:
                self.engine_manager.send_message("/n_set", node_id, "solo", 1 if solo else 0)

            logger.debug(f"Updated mixer channel {track_id} (node {node_id})")

        except Exception as e:
            logger.error(f"❌ Failed to update mixer channel {track_id}: {e}")
            raise

    async def free_mixer_channel(self, track_id: str) -> None:
        """
        Free a mixer channel synth

        Args:
            track_id: Sequencer track ID
        """
        try:
            node_id = self.mixer_channels.get(track_id)
            if node_id is None:
                return

            self.engine_manager.send_message("/n_free", node_id)
            del self.mixer_channels[track_id]

            logger.info(f"🗑️ Freed mixer channel for track {track_id} (node {node_id})")

        except Exception as e:
            logger.error(f"❌ Failed to free mixer channel {track_id}: {e}")


    def get_track_id_from_index(self, track_index: int) -> Optional[str]:
        """
        Get track ID from numeric track index

        Args:
            track_index: Numeric track index (used in SuperCollider)

        Returns:
            Track ID string, or None if not found
        """
        for track_id, index in self.track_id_to_index.items():
            if index == track_index:
                return track_id
        return None
