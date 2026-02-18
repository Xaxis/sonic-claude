"""
Effects Models - Data models for audio effects
"""
from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class EffectParameter(BaseModel):
    """Effect parameter definition"""
    name: str
    display_name: str
    type: str  # "float", "int", "bool", "enum"
    default: float
    min: Optional[float] = None
    max: Optional[float] = None
    unit: Optional[str] = None  # "dB", "Hz", "ms", "%", etc.
    options: Optional[List[str]] = None  # For enum type


class EffectDefinition(BaseModel):
    """Effect definition (template)"""
    name: str  # SynthDef name (e.g., "lpf", "reverb")
    display_name: str  # Human-readable name
    category: str  # "Filter", "EQ", "Dynamics", "Time-Based", "Distortion", "Utility"
    description: str
    parameters: List[EffectParameter]
    is_stereo: bool = True
    latency_ms: float = 0.0  # Processing latency


class EffectInstance(BaseModel):
    """Active effect instance on a track"""
    id: str  # Unique instance ID
    effect_name: str  # Reference to EffectDefinition name
    display_name: str  # User-customizable name
    
    # Routing
    track_id: Optional[str] = None  # Track this effect is on (None for master/send)
    slot_index: int = 0  # Position in insert chain (0-7)
    
    # Parameters (current values)
    parameters: Dict[str, float] = Field(default_factory=dict)
    
    # State
    is_bypassed: bool = False
    is_enabled: bool = True
    
    # SuperCollider
    sc_node_id: Optional[int] = None
    sc_bus_in: Optional[int] = None
    sc_bus_out: Optional[int] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class TrackEffectChain(BaseModel):
    """Effect chain for a track"""
    track_id: str
    effects: List[EffectInstance] = Field(default_factory=list)  # Ordered list (0-7 slots)
    max_slots: int = 8  # Maximum number of insert effects per track


# API Request/Response models
class CreateEffectRequest(BaseModel):
    """Request to create a new effect instance"""
    effect_name: str  # SynthDef name
    track_id: Optional[str] = None  # None for master/send effects
    slot_index: Optional[int] = None  # Auto-assign if None
    display_name: Optional[str] = None  # Auto-generate if None


class UpdateEffectRequest(BaseModel):
    """Request to update effect parameters"""
    parameters: Optional[Dict[str, float]] = None
    is_bypassed: Optional[bool] = None
    display_name: Optional[str] = None


class MoveEffectRequest(BaseModel):
    """Request to move effect to different slot"""
    new_slot_index: int


class EffectListResponse(BaseModel):
    """Response with list of effect definitions"""
    effects: List[EffectDefinition]


class TrackEffectChainResponse(BaseModel):
    """Response with track's effect chain"""
    track_id: str
    effects: List[EffectInstance]

