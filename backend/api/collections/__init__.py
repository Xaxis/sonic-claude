"""
Collections API — Unified discovery layer for all catalog types

SynthDefs, drum kits, and samples are all "collections" — discoverable
catalog items that users browse and load into their project.

Routes:
    GET /api/collections/synthdefs  → all available synthesizers
    GET /api/collections/drumkits   → all drum kit definitions
    GET /api/collections/samples    → user's sample library
"""
from fastapi import APIRouter
from . import discovery

router = APIRouter()
router.include_router(discovery.router, tags=["collections"])
