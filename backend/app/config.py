from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Reads settings from environment variables (or a local .env file)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str                      # e.g. https://xxxx.supabase.co
    supabase_anon_key: str                 # public key; RLS still protects data
    supabase_service_role_key: str = ""    # server-only; used later for audit + storage
    cors_origins: str = "http://localhost:3000"  # comma-separated list
    ml_service_url: str = "http://localhost:8000"
    ocr_service_url: str = ""              # empty = OCR not connected; reports stay 'uploaded'


@lru_cache
def get_settings() -> Settings:
    return Settings()
