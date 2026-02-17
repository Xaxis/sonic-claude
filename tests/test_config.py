"""
Tests for configuration system
"""
import os
import pytest
from backend.core.config import Settings, get_settings


def test_settings_defaults():
    """Test that settings load with default values"""
    settings = Settings()

    # Server defaults
    assert settings.server.host == "0.0.0.0"
    assert settings.server.port == 8000
    assert settings.server.debug is False

    # SuperCollider defaults
    assert settings.supercollider.scsynth_port == 57110
    assert settings.supercollider.sclang_port == 57120
    assert settings.supercollider.python_port == 57121

    # Storage defaults (Path objects)
    assert str(settings.storage.sequences_dir) == "data/sequences"
    assert str(settings.storage.samples_dir) == "data/samples"

    # Audio defaults
    assert settings.audio.sample_rate == 48000
    assert settings.audio.buffer_size == 64  # Default is 64, not 512


def test_settings_from_env(monkeypatch):
    """Test that settings can be loaded from environment variables"""
    # Set environment variables
    monkeypatch.setenv("SERVER__PORT", "9000")
    monkeypatch.setenv("SERVER__DEBUG", "true")
    monkeypatch.setenv("STORAGE__SEQUENCES_DIR", "/tmp/sequences")
    monkeypatch.setenv("AUDIO__SAMPLE_RATE", "44100")

    settings = Settings()

    assert settings.server.port == 9000
    assert settings.server.debug is True
    assert str(settings.storage.sequences_dir) == "/tmp/sequences"  # Path object
    assert settings.audio.sample_rate == 44100


def test_settings_validation():
    """Test that invalid settings raise validation errors"""
    from pydantic import ValidationError
    
    # Invalid port (negative)
    with pytest.raises(ValidationError):
        Settings(server={"port": -1})
    
    # Invalid sample rate (too low)
    with pytest.raises(ValidationError):
        Settings(audio={"sample_rate": 100})


def test_get_settings_singleton():
    """Test that get_settings returns the same instance"""
    settings1 = get_settings()
    settings2 = get_settings()
    
    assert settings1 is settings2


def test_test_settings_fixture(test_settings):
    """Test that test_settings fixture provides correct test configuration"""
    assert test_settings.server.debug is True
    assert str(test_settings.storage.sequences_dir) == "tests/data/sequences"
    assert str(test_settings.storage.samples_dir) == "tests/data/samples"

