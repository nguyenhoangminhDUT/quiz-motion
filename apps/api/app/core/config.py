import json
from pathlib import Path
from typing import Annotated, Literal, Self
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy.engine import make_url

API_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = API_DIR.parent.parent
DEFAULT_DATABASE_URL = (
    "postgresql+asyncpg://action_quiz:action_quiz_dev_only@localhost:55432/action_quiz"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", API_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        hide_input_in_errors=True,
    )

    app_name: str = "Action Quiz API"
    app_env: Literal["development", "test", "production"] = "development"
    api_host: str = "127.0.0.1"
    api_port: int = Field(default=8000, ge=1, le=65535)
    database_url: SecretStr = SecretStr(DEFAULT_DATABASE_URL)
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: SecretStr) -> SecretStr:
        try:
            parsed = make_url(value.get_secret_value())
        except Exception:
            raise ValueError("DATABASE_URL must be a valid PostgreSQL asyncpg URL.") from None
        if parsed.drivername != "postgresql+asyncpg" or not parsed.host or not parsed.database:
            raise ValueError("DATABASE_URL must specify PostgreSQL asyncpg, host and database.")
        return value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_origins(cls, value: object) -> object:
        if isinstance(value, str):
            if value.strip().startswith("["):
                return json.loads(value)
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, origins: list[str]) -> list[str]:
        normalized = []
        for origin in origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.username
                or parsed.password
                or parsed.path not in {"", "/"}
                or parsed.query
                or parsed.fragment
                or "*" in origin
            ):
                raise ValueError("CORS_ORIGINS must contain explicit HTTP(S) origins only.")
            normalized.append(origin.rstrip("/"))
        return normalized

    @model_validator(mode="after")
    def require_production_configuration(self) -> Self:
        if self.app_env == "production":
            if "database_url" not in self.model_fields_set:
                raise ValueError("Production requires explicit DATABASE_URL.")
            if self.database_url.get_secret_value() == DEFAULT_DATABASE_URL:
                raise ValueError("Development database defaults are forbidden in production.")
            if "cors_origins" not in self.model_fields_set or not self.cors_origins:
                raise ValueError("Production requires explicit nonempty CORS_ORIGINS.")
        return self
