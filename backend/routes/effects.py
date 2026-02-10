"""
Effects API Routes
REST API for effects control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel, Field

from backend.core import get_logger
from backend.core.dependencies import get_effects_service
from ..services.effects_service import EffectsService
from ..models.effect import EffectType

logger = get_logger(__name__)

router = APIRouter(prefix="/audio/effects", tags=["Audio Engine - Effects"])


# ===== REQUEST/RESPONSE MODELS =====

class CreateEffectRequest(BaseModel):
    """Request to create an effect"""
    effectdef: str = Field(..., description="EffectDef name")
    parameters: Dict[str, float] = Field(default_factory=dict, description="Initial parameters")
    group: int = Field(default=1, description="Target group ID")
    input_bus: int = Field(..., description="Input bus ID")
    output_bus: Optional[int] = Field(None, description="Output bus ID")


class UpdateEffectRequest(BaseModel):
    """Request to update effect parameter"""
    parameter: str = Field(..., description="Parameter name")
    value: float = Field(..., description="Parameter value")


class EffectResponse(BaseModel):
    """Effect response"""
    id: int
    effectdef: str
    parameters: Dict[str, float]
    group: int
    input_bus: int
    output_bus: Optional[int]


class EffectDefResponse(BaseModel):
    """EffectDef response"""
    name: str
    effect_type: str
    parameters: Dict[str, float]
    description: str
    parameter_ranges: Dict[str, tuple[float, float]]
    parameter_descriptions: Dict[str, str]


# ===== ROUTES =====

@router.get("/effectdefs", response_model=List[EffectDefResponse])
async def get_effectdefs(service: EffectsService = Depends(get_effects_service)):
    """Get all available EffectDefs"""
    effectdefs = service.get_effectdefs()
    return [
        EffectDefResponse(
            name=ed.name,
            effect_type=ed.effect_type.value,
            parameters=ed.parameters,
            description=ed.description,
            parameter_ranges=ed.parameter_ranges,
            parameter_descriptions=ed.parameter_descriptions
        )
        for ed in effectdefs
    ]


@router.get("/effectdefs/{effect_type}", response_model=List[EffectDefResponse])
async def get_effectdefs_by_type(effect_type: str, service: EffectsService = Depends(get_effects_service)):
    """Get EffectDefs by type"""
    try:
        effect_type_enum = EffectType(effect_type)
        effectdefs = service.get_effectdefs_by_type(effect_type_enum)
        return [
            EffectDefResponse(
                name=ed.name,
                effect_type=ed.effect_type.value,
                parameters=ed.parameters,
                description=ed.description,
                parameter_ranges=ed.parameter_ranges,
                parameter_descriptions=ed.parameter_descriptions
            )
            for ed in effectdefs
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid effect type: {effect_type}")


@router.post("/effects", response_model=EffectResponse)
async def create_effect(request: CreateEffectRequest, service: EffectsService = Depends(get_effects_service)):
    """Create a new effect instance"""
    try:
        effect = await service.create_effect(
            effectdef=request.effectdef,
            parameters=request.parameters,
            group=request.group,
            input_bus=request.input_bus,
            output_bus=request.output_bus
        )

        return EffectResponse(
            id=effect.id,
            effectdef=effect.effectdef,
            parameters=effect.parameters,
            group=effect.group,
            input_bus=effect.input_bus,
            output_bus=effect.output_bus
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create effect: {e}")
        raise HTTPException(status_code=500, detail="Failed to create effect")


@router.delete("/effects/{effect_id}")
async def free_effect(effect_id: int, service: EffectsService = Depends(get_effects_service)):
    """Free an effect"""
    await service.free_effect(effect_id)
    return {"status": "freed", "effect_id": effect_id}


@router.put("/effects/{effect_id}")
async def update_effect(effect_id: int, request: UpdateEffectRequest, service: EffectsService = Depends(get_effects_service)):
    """Update effect parameter"""
    try:
        await service.set_parameter(effect_id, request.parameter, request.value)
        return {"status": "updated", "effect_id": effect_id, "parameter": request.parameter, "value": request.value}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

