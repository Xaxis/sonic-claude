"""
Tests for dependency injection system
"""
import pytest
from backend.core.dependencies import get_settings
from backend.api.sample_routes import get_samples_dir, get_metadata_file


def test_get_settings_dependency(test_settings):
    """Test that get_settings dependency works"""
    settings = get_settings()
    assert settings is not None
    assert hasattr(settings, 'server')
    assert hasattr(settings, 'supercollider')
    assert hasattr(settings, 'storage')


def test_get_samples_dir_dependency(override_get_settings):
    """Test that get_samples_dir creates directory and returns path"""
    import os

    samples_dir = get_samples_dir(override_get_settings)

    # Should return the configured path
    assert samples_dir == override_get_settings.storage.samples_dir

    # Should create the directory
    assert os.path.exists(samples_dir)


def test_get_metadata_file_dependency(override_get_settings):
    """Test that get_metadata_file returns correct path"""
    import os

    metadata_file = get_metadata_file(override_get_settings)

    # Should return path to metadata.json in samples directory
    expected_path = os.path.join(
        override_get_settings.storage.samples_dir,
        "metadata.json"
    )
    assert metadata_file == expected_path

