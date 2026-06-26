"""Application settings.

This module owns environment-based configuration for the backend. Values are
loaded from the process environment and from a local `.env` file when present.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application configuration loaded from environment variables."""

    # Application metadata and runtime mode.
    APP_NAME: str = "Project Zenith: The Celestial Eye"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # External API base URLs used by astronomy, satellite, ISS, and weather integrations.
    NASA_HORIZONS_URL: str = "https://ssd.jpl.nasa.gov/api/horizons.api"
    CELESTRAK_URL: str = "https://celestrak.org"
    OPEN_NOTIFY_URL: str = "http://api.open-notify.org"
    OPEN_METEO_URL: str = "https://api.open-meteo.com"

    # AI provider credentials.
    OPENAI_API_KEY: str = ""

    # Redis connection string for cache, queues, or ephemeral backend state.
    REDIS_URL: str = "redis://localhost:6379/0"

    # Load environment values from a local .env file when present.
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @property
    def PROJECT_NAME(self) -> str:
        """Backward-compatible alias for older imports."""
        return self.APP_NAME

    @property
    def PROJECT_VERSION(self) -> str:
        """Backward-compatible alias for older imports."""
        return self.APP_VERSION


# Singleton settings object imported by the rest of the application.
settings = Settings()
