"""
Synthesis API Routes
REST API for synthesis control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from backend.core import get_logger
from backend.core.dependencies import get_synthesis_service
from ..services.synthesis_service import SynthesisService
from ..models.synth import SynthDef

logger = get_logger(__name__)

router = APIRouter(prefix="/audio/synthesis", tags=["Audio Engine - Synthesis"])


# ===== REQUEST/RESPONSE MODELS =====

class CreateSynthRequest(BaseModel):
    """Request to create a synth"""
    synthdef: str = Field(..., description="SynthDef name")
    parameters: Dict[str, float] = Field(default_factory=dict, description="Initial parameters")
    group: int = Field(default=1, description="Target group ID")
    bus: Optional[int] = Field(None, description="Output bus ID")


class UpdateSynthRequest(BaseModel):
    """Request to update synth parameter"""
    parameter: str = Field(..., description="Parameter name")
    value: float = Field(..., description="Parameter value")


class SynthResponse(BaseModel):
    """Synth response"""
    id: int
    synthdef: str
    parameters: Dict[str, float]
    group: int
    bus: Optional[int]


class SynthDefResponse(BaseModel):
    """SynthDef response"""
    name: str
    category: str
    parameters: Dict[str, float]
    description: str
    parameter_ranges: Dict[str, tuple[float, float]]
    parameter_descriptions: Dict[str, str]


# ===== ROUTES =====

@router.get("/synthdefs", response_model=List[SynthDefResponse])
async def get_synthdefs(service: SynthesisService = Depends(get_synthesis_service)):
    """Get all available SynthDefs"""
    synthdefs = service.get_synthdefs()
    return [
        SynthDefResponse(
            name=sd.name,
            category=sd.category,
            parameters=sd.parameters,
            description=sd.description,
            parameter_ranges=sd.parameter_ranges,
            parameter_descriptions=sd.parameter_descriptions
        )
        for sd in synthdefs
    ]


@router.get("/synthdefs/{category}", response_model=List[SynthDefResponse])
async def get_synthdefs_by_category(category: str, service: SynthesisService = Depends(get_synthesis_service)):
    """Get SynthDefs by category"""
    synthdefs = service.get_synthdefs_by_category(category)
    return [
        SynthDefResponse(
            name=sd.name,
            category=sd.category,
            parameters=sd.parameters,
            description=sd.description,
            parameter_ranges=sd.parameter_ranges,
            parameter_descriptions=sd.parameter_descriptions
        )
        for sd in synthdefs
    ]


@router.post("/synths", response_model=SynthResponse)
async def create_synth(request: CreateSynthRequest, service: SynthesisService = Depends(get_synthesis_service)):
    """Create a new synth instance"""
    
    try:
        synth = await service.create_synth(
            synthdef=request.synthdef,
            parameters=request.parameters,
            group=request.group,
            bus=request.bus
        )

        return SynthResponse(
            id=synth.id,
            synthdef=synth.synthdef,
            parameters=synth.parameters,
            group=synth.group,
            bus=synth.bus
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create synth: {e}")
        raise HTTPException(status_code=500, detail="Failed to create synth")


@router.delete("/synths/{synth_id}")
async def free_synth(synth_id: int, service: SynthesisService = Depends(get_synthesis_service)):
    """Free a synth"""
    await service.free_synth(synth_id)
    return {"status": "freed", "synth_id": synth_id}


@router.put("/synths/{synth_id}")
async def update_synth(synth_id: int, request: UpdateSynthRequest, service: SynthesisService = Depends(get_synthesis_service)):
    """Update synth parameter"""
    try:
        await service.set_parameter(synth_id, request.parameter, request.value)
        return {"status": "updated", "synth_id": synth_id, "parameter": request.parameter, "value": request.value}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

