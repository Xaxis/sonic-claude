"""
Engine status and bus models
"""
from dataclasses import dataclass
from typing import Literal


@dataclass
class EngineStatus:
    """SuperCollider engine status"""
    running: bool
    sample_rate: int
    block_size: int
    cpu_usage: float
    active_synths: int
    active_groups: int
    num_audio_buses: int
    num_control_buses: int


@dataclass
class AudioBus:
    """Audio bus for routing audio signals"""
    id: int
    channels: int
    rate: Literal["audio", "control"] = "audio"
    name: str = ""
    
    def __post_init__(self):
        if not self.name:
            self.name = f"audio_bus_{self.id}"


@dataclass
class ControlBus:
    """Control bus for routing control signals"""
    id: int
    rate: Literal["audio", "control"] = "control"
    name: str = ""
    value: float = 0.0
    
    def __post_init__(self):
        if not self.name:
            self.name = f"control_bus_{self.id}"

