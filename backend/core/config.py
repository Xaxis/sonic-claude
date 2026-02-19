"""
Configuration Management - Centralized settings with environment variable support

Uses Pydantic Settings for type-safe configuration with validation.
Supports .env files and environment variables.

Environment Variables:
    # Server
    HOST: Server host (default: 0.0.0.0)
    PORT: Server port (default: 8000)
    LOG_LEVEL: Logging level (default: INFO)
    
    # SuperCollider
    SC_HOST: SuperCollider host (default: 127.0.0.1)
    SC_SCSYNTH_PORT: scsynth command port (default: 57110)
    SC_SCLANG_PORT: sclang listening port (default: 57120)
    SC_PYTHON_PORT: Python listening port (default: 57121)
    
    # Storage
    DATA_DIR: Data directory (default: data)
    SAMPLES_DIR: Samples directory (default: data/samples)
    SEQUENCES_DIR: Sequences directory (default: data/sequences)
    
    # Audio
    SAMPLE_RATE: Audio sample rate (default: 48000)
    BUFFER_SIZE: Audio buffer size (default: 64)
    
    # CORS
    CORS_ORIGINS: Allowed CORS origins (default: *)

    # AI (use __ for nested config, e.g., AI__ANTHROPIC_API_KEY)
    AI__ANTHROPIC_API_KEY: Anthropic API key for Claude
    AI__MODEL: AI model to use (default: claude-3-5-sonnet-20241022)

    # Development
    DEBUG: Enable debug mode (default: False)
    RELOAD: Enable auto-reload (default: False)
"""
import os
from pathlib import Path
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerConfig(BaseSettings):
    """Server configuration"""
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, ge=1, le=65535, description="Server port")
    log_level: str = Field(default="INFO", description="Logging level")
    debug: bool = Field(default=False, description="Debug mode")
    reload: bool = Field(default=False, description="Auto-reload on code changes")
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v_upper


class SuperColliderConfig(BaseSettings):
    """SuperCollider OSC configuration"""
    host: str = Field(default="127.0.0.1", description="SuperCollider host")
    scsynth_port: int = Field(default=57110, ge=1, le=65535, description="scsynth command port")
    sclang_port: int = Field(default=57120, ge=1, le=65535, description="sclang listening port")
    python_port: int = Field(default=57121, ge=1, le=65535, description="Python listening port")
    
    model_config = SettingsConfigDict(env_prefix="SC_")


class StorageConfig(BaseSettings):
    """Storage paths configuration"""
    data_dir: Path = Field(default=Path("data"), description="Data directory")
    samples_dir: Path = Field(default=Path("data/samples"), description="Samples directory")
    compositions_dir: Path = Field(default=Path("data/compositions"), description="Compositions directory (unified storage)")
    sequences_dir: Path = Field(default=Path("data/sequences"), description="Sequences directory (DEPRECATED - use compositions_dir)")

    def ensure_directories(self) -> None:
        """Create directories if they don't exist"""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.samples_dir.mkdir(parents=True, exist_ok=True)
        self.compositions_dir.mkdir(parents=True, exist_ok=True)
        self.sequences_dir.mkdir(parents=True, exist_ok=True)  # Keep for migration


class AudioConfig(BaseSettings):
    """Audio engine configuration"""
    sample_rate: int = Field(default=48000, ge=8000, le=192000, description="Sample rate in Hz")
    buffer_size: int = Field(default=64, ge=16, le=4096, description="Buffer size in samples")
    
    @field_validator("buffer_size")
    @classmethod
    def validate_buffer_size(cls, v: int) -> int:
        """Validate buffer size is power of 2"""
        if v & (v - 1) != 0:
            raise ValueError("buffer_size must be a power of 2")
        return v


class CORSConfig(BaseSettings):
    """CORS configuration"""
    origins: List[str] = Field(default=["*"], description="Allowed CORS origins")
    credentials: bool = Field(default=True, description="Allow credentials")
    methods: List[str] = Field(default=["*"], description="Allowed methods")
    headers: List[str] = Field(default=["*"], description="Allowed headers")

    model_config = SettingsConfigDict(env_prefix="CORS_")


class AIConfig(BaseSettings):
    """AI integration configuration"""
    anthropic_api_key: str = Field(default="", description="Anthropic API key", validation_alias="ANTHROPIC_API_KEY")
    model: str = Field(default="claude-3-5-sonnet-20241022", description="AI model to use")
    min_call_interval: float = Field(default=2.0, ge=0.5, description="Minimum seconds between LLM calls")


class Settings(BaseSettings):
    """Main application settings"""
    # Application metadata
    app_name: str = Field(default="Sonic Claude Backend", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")

    # Sub-configurations
    server: ServerConfig = Field(default_factory=ServerConfig)
    supercollider: SuperColliderConfig = Field(default_factory=SuperColliderConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    audio: AudioConfig = Field(default_factory=AudioConfig)
    cors: CORSConfig = Field(default_factory=CORSConfig)
    ai: AIConfig = Field(default_factory=AIConfig)

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),  # backend/core/config.py -> backend/.env
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure storage directories exist
        self.storage.ensure_directories()


# Global settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """
    Get application settings (singleton pattern)

    Returns:
        Settings instance
    """
    global _settings
    if _settings is None:
        import logging
        logger = logging.getLogger(__name__)

        # Debug: Show where we're looking for .env
        cwd = os.getcwd()
        logger.info(f"🔍 Current working directory: {cwd}")

        env_paths = [".env", "../.env"]
        for env_path in env_paths:
            full_path = os.path.abspath(os.path.join(cwd, env_path))
            if os.path.exists(full_path):
                logger.info(f"✅ Found .env file at: {full_path}")
                # Read and show AI__ variables
                with open(full_path, 'r') as f:
                    for line in f:
                        if line.strip().startswith('AI__'):
                            logger.info(f"   📄 {line.strip()[:50]}...")
            else:
                logger.info(f"❌ No .env file at: {full_path}")

        _settings = Settings()

        # Debug: Show what was loaded
        logger.info(f"🔑 AI API key loaded: {'YES' if _settings.ai.anthropic_api_key else 'NO'}")
        if _settings.ai.anthropic_api_key:
            logger.info(f"🔑 API key starts with: {_settings.ai.anthropic_api_key[:15]}...")
        else:
            logger.error(f"❌ AI config: anthropic_api_key='{_settings.ai.anthropic_api_key}'")
            logger.error(f"❌ AI config: model='{_settings.ai.model}'")
    return _settings


# Convenience function for FastAPI dependency injection
def get_settings_dependency() -> Settings:
    """FastAPI dependency for settings injection"""
    return get_settings()

