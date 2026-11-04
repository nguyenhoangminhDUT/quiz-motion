import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_load_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_NAME", "Test API")
    monkeypatch.setenv("API_PORT", "8090")
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    settings = Settings(_env_file=None)
    assert settings.app_name == "Test API"
    assert settings.api_port == 8090
    assert settings.cors_origins == ["http://localhost:3000", "http://127.0.0.1:3000"]
    assert "action_quiz_dev_only" not in repr(settings)


def test_json_origins_and_production_validation() -> None:
    assert Settings(_env_file=None, cors_origins='["https://quiz.example/"]').cors_origins == [
        "https://quiz.example"
    ]
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_env="production")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, cors_origins=["*"])
    with pytest.raises(ValidationError):
        Settings(_env_file=None, database_url="sqlite:///local.db")
    settings = Settings(
        _env_file=None,
        app_env="production",
        database_url="postgresql+asyncpg://app:explicit@db.example/quiz",
        cors_origins=["https://quiz.example"],
    )
    assert settings.app_env == "production"
