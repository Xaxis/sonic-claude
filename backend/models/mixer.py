"""
Mixer Models - Pydantic models for mixer channels and routing
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MixerChannel(BaseModel):
    """Mixer channel model"""
    id: str
    name: str
    color: str = "#3b82f6"
    type: str = "audio"  # "audio", "instrument", "master"
    
    # Input
    input_source: Optional[str] = None
    input_gain: float = 0.0  # dB (-60 to +12)
    phase_invert: bool = False
    
    # Channel Strip
    pan: float = 0.0  # -1.0 (left) to 1.0 (right)
    fader: float = 0.0  # dB (-inf to +12)
    mute: bool = False
    solo: bool = False
    
    # Routing
    output_bus: str = "master"
    
    # Metering (updated via WebSocket)
    meter_peak_left: float = -60.0
    meter_peak_right: float = -60.0
    
    # State
    armed: bool = False
    monitoring: bool = False
    
    # SuperCollider
    sc_node_id: Optional[int] = None
    sc_bus_index: Optional[int] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MasterChannel(BaseModel):
    """Master channel model"""
    id: str = "master"
    name: str = "Master"
    color: str = "#ef4444"
    type: str = "master"
    
    # Channel Strip
    fader: float = 0.0  # dB
    mute: bool = False
    
    # Metering
    meter_peak_left: float = -60.0
    meter_peak_right: float = -60.0
    
    # Master-specific
    limiter_enabled: bool = False
    limiter_threshold: float = -1.0  # dB
    
    # SuperCollider
    sc_bus_index: int = 0  # Master bus is always bus 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MixerState(BaseModel):
    """Complete mixer state"""
    channels: List[MixerChannel] = []
    master: MasterChannel = Field(default_factory=MasterChannel)
    
    # View settings
    show_meters: bool = True
    meter_mode: str = "peak"  # "peak", "rms", "both"
    
    # Selection
    selected_channel_id: Optional[str] = None


# API Request/Response models
class CreateChannelRequest(BaseModel):
    """Request to create a new mixer channel"""
    name: str
    type: str = "audio"
    color: Optional[str] = None


class UpdateChannelRequest(BaseModel):
    """Request to update mixer channel properties"""
    name: Optional[str] = None
    color: Optional[str] = None
    input_gain: Optional[float] = None
    pan: Optional[float] = None
    fader: Optional[float] = None
    mute: Optional[bool] = None
    solo: Optional[bool] = None
    phase_invert: Optional[bool] = None
    output_bus: Optional[str] = None


class UpdateMasterRequest(BaseModel):
    """Request to update master channel properties"""
    fader: Optional[float] = None
    mute: Optional[bool] = None
    limiter_enabled: Optional[bool] = None
    limiter_threshold: Optional[float] = None


class MixerSnapshot(BaseModel):
    """Mixer state snapshot for save/recall"""
    id: str
    name: str
    timestamp: datetime = Field(default_factory=datetime.now)
    state: MixerState

