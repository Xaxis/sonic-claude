"""
Pytest configuration and fixtures for Sonic Claude tests
"""
import os
import pytest
from typing import Generator
from fastapi.testclient import TestClient

from backend.core.config import Settings, get_settings


@pytest.fixture
def test_settings() -> Settings:
    """
    Provide test settings with safe defaults

    Uses in-memory or temporary paths to avoid affecting production data
    """
    return Settings(
        server={"host": "127.0.0.1", "port": 8000, "debug": True},
        supercollider={
            "host": "127.0.0.1",
            "scsynth_port": 57110,
            "sclang_port": 57120,
            "python_port": 57121
        },
        storage={
            "data_dir": "tests/data",
            "sequences_dir": "tests/data/sequences",
            "samples_dir": "tests/data/samples"
        },
        audio={
            "sample_rate": 48000,
            "buffer_size": 512
        },
        cors={
            "origins": ["http://localhost:3000"],
            "credentials": True,
            "methods": ["*"],
            "headers": ["*"]
        }
    )


@pytest.fixture
def override_get_settings(test_settings: Settings):
    """
    Override the get_settings dependency for testing
    
    This allows tests to use test-specific settings without affecting
    the global settings singleton
    """
    from backend.core import config
    original_settings = config._settings
    config._settings = test_settings
    yield test_settings
    config._settings = original_settings


@pytest.fixture
def app(override_get_settings):
    """
    Provide FastAPI app instance with test settings
    
    Note: This does NOT initialize services (no SuperCollider connection)
    For integration tests that need services, use app_with_services fixture
    """
    from backend.main import app
    return app


@pytest.fixture
def client(app) -> Generator[TestClient, None, None]:
    """
    Provide test client for making HTTP requests
    
    This is for unit tests that don't need actual service initialization
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def temp_test_dirs(test_settings: Settings):
    """
    Create temporary test directories and clean them up after tests
    """
    import shutil
    
    # Create test directories
    os.makedirs(test_settings.storage.sequences_dir, exist_ok=True)
    os.makedirs(test_settings.storage.samples_dir, exist_ok=True)
    
    yield test_settings
    
    # Cleanup after tests
    if os.path.exists("tests/data"):
        shutil.rmtree("tests/data")

