"""
Collection Discovery Routes

All three collection types follow the same pattern:
    GET /api/collections/{type} → List of items (plain array, no wrapper)

Each endpoint is thin — it delegates to the existing registry or storage layer.
"""
import logging
from fastapi import APIRouter, Depends

from backend.services.daw.registry import get_all_synthdefs, get_all_kits
from backend.api.samples.utils import get_metadata_file, load_metadata
from backend.core.exceptions import ServiceError

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/synthdefs")
async def list_synthdefs():
    """All available SynthDef synthesizers."""
    try:
        return get_all_synthdefs()
    except Exception as e:
        logger.error(f"❌ Failed to list synthdefs: {e}")
        raise ServiceError(f"Failed to list synthdefs: {str(e)}")


@router.get("/drumkits")
async def list_drumkits():
    """All available drum kit definitions."""
    try:
        return get_all_kits()
    except Exception as e:
        logger.error(f"❌ Failed to list drumkits: {e}")
        raise ServiceError(f"Failed to list drumkits: {str(e)}")


@router.get("/samples")
async def list_samples(metadata_file: str = Depends(get_metadata_file)):
    """User's sample library — same data as GET /api/samples/ but as a plain array."""
    try:
        metadata = load_metadata(metadata_file)
        return list(metadata.values())
    except Exception as e:
        logger.error(f"❌ Failed to list samples: {e}")
        raise ServiceError(f"Failed to list samples: {str(e)}")
