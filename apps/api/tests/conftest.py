from collections.abc import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        database_url="postgresql+asyncpg://test:test@127.0.0.1:1/action_quiz_test",
    )


@pytest.fixture
def application(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
async def client(application: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    async with application.router.lifespan_context(application):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application, raise_app_exceptions=False),
            base_url="http://test",
        ) as client:
            yield client
