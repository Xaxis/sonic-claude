"""
Application configuration
"""
import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    app_name: str = "Sonic Claude API"
    app_version: str = "2.0.0"
    debug: bool = False

    # Audio Settings
    audio_sample_rate: int = 48000
    audio_chunk_size: int = 2048
    audio_device_name: str = "BlackHole 2ch"
    
    # AI Settings
    anthropic_api_key: Optional[str] = None
    llm_model: str = "claude-sonnet-4-5-20250929"
    ai_decision_interval: float = 10.0  # seconds between AI decisions (when enabled)
    
    # CORS Settings
    cors_origins: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()

