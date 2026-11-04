import os

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.core.config import Settings
from app.infrastructure.database import Database
from app.main import create_app

pytestmark = pytest.mark.integration


async def test_postgres_query_migration_and_readiness() -> None:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set TEST_DATABASE_URL for a dedicated *_test database.")
    parsed = make_url(url)
    if not parsed.database or not parsed.database.endswith("_test"):
        pytest.fail("Refusing integration test: database name must end in _test.")
    settings = Settings(_env_file=None, app_env="test", database_url=url)
    database = Database(settings)
    try:
        assert await database.ping()
        async with database.engine.connect() as connection:
            assert (await connection.execute(text("SELECT 1"))).scalar_one() == 1
            assert (
                await connection.execute(text("SELECT version_num FROM alembic_version"))
            ).scalar_one() == "0001_baseline"
    finally:
        await database.dispose()
    application = create_app(settings)
    async with application.router.lifespan_context(application):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application), base_url="http://test"
        ) as client:
            response = await client.get("/api/v1/ready")
            assert response.status_code == 200
            assert response.json() == {"status": "ready", "database": "up"}
