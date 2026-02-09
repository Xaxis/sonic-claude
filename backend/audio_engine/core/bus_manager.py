"""
Audio and control bus management
"""
from typing import Dict, Optional
from ..models.engine import AudioBus, ControlBus


class BusManager:
    """Manages allocation and tracking of audio and control buses"""
    
    def __init__(self, num_audio_buses: int = 128, num_control_buses: int = 4096):
        """
        Initialize bus manager
        
        Args:
            num_audio_buses: Total number of audio buses available
            num_control_buses: Total number of control buses available
        """
        self.num_audio_buses = num_audio_buses
        self.num_control_buses = num_control_buses
        
        # Track allocated buses
        self.audio_buses: Dict[int, AudioBus] = {}
        self.control_buses: Dict[int, ControlBus] = {}
        
        # Track next available bus IDs (start after hardware buses 0-1)
        self.next_audio_bus = 2  # 0-1 are typically hardware outputs
        self.next_control_bus = 0
    
    def allocate_audio_bus(self, channels: int = 2, name: str = "") -> AudioBus:
        """
        Allocate an audio bus
        
        Args:
            channels: Number of channels (1=mono, 2=stereo)
            name: Optional name for the bus
            
        Returns:
            AudioBus instance
        """
        if self.next_audio_bus >= self.num_audio_buses:
            raise RuntimeError("No audio buses available")
        
        bus_id = self.next_audio_bus
        self.next_audio_bus += channels
        
        bus = AudioBus(id=bus_id, channels=channels, name=name)
        self.audio_buses[bus_id] = bus
        
        return bus
    
    def allocate_control_bus(self, name: str = "") -> ControlBus:
        """
        Allocate a control bus
        
        Args:
            name: Optional name for the bus
            
        Returns:
            ControlBus instance
        """
        if self.next_control_bus >= self.num_control_buses:
            raise RuntimeError("No control buses available")
        
        bus_id = self.next_control_bus
        self.next_control_bus += 1
        
        bus = ControlBus(id=bus_id, name=name)
        self.control_buses[bus_id] = bus
        
        return bus
    
    def free_audio_bus(self, bus_id: int):
        """Free an audio bus"""
        if bus_id in self.audio_buses:
            del self.audio_buses[bus_id]
    
    def free_control_bus(self, bus_id: int):
        """Free a control bus"""
        if bus_id in self.control_buses:
            del self.control_buses[bus_id]
    
    def get_audio_bus(self, bus_id: int) -> Optional[AudioBus]:
        """Get audio bus by ID"""
        return self.audio_buses.get(bus_id)
    
    def get_control_bus(self, bus_id: int) -> Optional[ControlBus]:
        """Get control bus by ID"""
        return self.control_buses.get(bus_id)
    
    def reset(self):
        """Reset all bus allocations"""
        self.audio_buses.clear()
        self.control_buses.clear()
        self.next_audio_bus = 2
        self.next_control_bus = 0

