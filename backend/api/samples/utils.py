"""
Sample Utilities - Helper functions for sample management

This module provides shared utilities for sample operations.
"""
import logging
import os
import json
from fastapi import Depends

from backend.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


def get_samples_dir(settings: Settings = Depends(get_settings)) -> str:
    """Get samples directory from settings (already ensured by config.ensure_directories())"""
    return str(settings.storage.samples_dir)


def get_metadata_file(settings: Settings = Depends(get_settings)) -> str:
    """Get metadata file path from settings"""
    return os.path.join(settings.storage.samples_dir, "metadata.json")


def load_metadata(metadata_file: str) -> dict:
    """Load sample metadata from JSON file"""
    if not os.path.exists(metadata_file):
        return {}
    try:
        with open(metadata_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load metadata: {e}")
        return {}


def save_metadata(metadata: dict, metadata_file: str):
    """Save sample metadata to JSON file"""
    try:
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save metadata: {e}")
        raise

