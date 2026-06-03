from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://lain42:lain42@localhost:5432/lain42"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    github_client_id: str = ""
    github_client_secret: str = ""
    github_redirect_uri: str = "http://localhost:5173/login/callback?provider=github"

    gitee_client_id: str = ""
    gitee_client_secret: str = ""
    gitee_redirect_uri: str = "http://localhost:5173/login/callback?provider=gitee"

    gitcode_client_id: str = ""
    gitcode_client_secret: str = ""
    gitcode_redirect_uri: str = "http://localhost:5173/login/callback?provider=gitcode"

    upload_dir: Path = Path("/data/images")
    max_image_size_mb: int = 2

    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
