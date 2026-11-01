from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    # Legacy HS256 secret (local `supabase start` and older projects). Leave empty to use JWKS only.
    supabase_jwt_secret: str = ""
    cors_origins: list[str] = ["http://localhost:1420", "http://tauri.localhost", "tauri://localhost"]
    environment: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
