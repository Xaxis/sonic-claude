"""
Audio Bus Manager - Manages audio bus allocation for tracks

SuperCollider Bus Architecture:
- Bus 0-1: Hardware outputs (stereo master)
- Bus 2-9: Reserved for system use
- Bus 10+: Track buses (allocated dynamically)

Each track gets a stereo bus pair for routing audio through mixer channels
"""
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class AudioBusManager:
    """
    Manages audio bus allocation for sequencer tracks
    
    Architecture:
    - Each track gets a stereo bus (2 channels)
    - Track synths output to their track bus
    - Mixer channel synth reads from track bus, outputs to master (bus 0)
    """
    
    def __init__(self):
        self.next_bus_id = 10  # Start at bus 10 (0-9 reserved)
        self.track_buses: Dict[str, int] = {}  # track_id -> bus_id mapping
        
    def allocate_track_bus(self, track_id: str) -> int:
        """
        Allocate a stereo bus for a track
        
        Args:
            track_id: Sequencer track ID
            
        Returns:
            Bus ID (stereo pair starts at this ID)
        """
        if track_id in self.track_buses:
            logger.warning(f"⚠️ Track {track_id} already has bus {self.track_buses[track_id]}")
            return self.track_buses[track_id]
        
        bus_id = self.next_bus_id
        self.next_bus_id += 2  # Stereo = 2 channels
        
        self.track_buses[track_id] = bus_id
        logger.info(f"🎚️ Allocated bus {bus_id} for track {track_id}")
        
        return bus_id
    
    def get_track_bus(self, track_id: str) -> Optional[int]:
        """
        Get the bus ID for a track
        
        Args:
            track_id: Sequencer track ID
            
        Returns:
            Bus ID or None if not allocated
        """
        return self.track_buses.get(track_id)
    
    def free_track_bus(self, track_id: str) -> None:
        """
        Free a track's bus allocation
        
        Args:
            track_id: Sequencer track ID
        """
        if track_id in self.track_buses:
            bus_id = self.track_buses[track_id]
            del self.track_buses[track_id]
            logger.info(f"🗑️ Freed bus {bus_id} for track {track_id}")
    
    def free_all_buses(self) -> None:
        """Free all track bus allocations"""
        count = len(self.track_buses)
        self.track_buses.clear()
        self.next_bus_id = 10
        logger.info(f"🗑️ Freed all {count} track buses")
    
    def get_all_track_buses(self) -> Dict[str, int]:
        """Get all track bus allocations"""
        return self.track_buses.copy()

