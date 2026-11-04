from unittest.mock import AsyncMock

import httpx
from fastapi import FastAPI
from sqlalchemy.exc import SQLAlchemyError

from app.application.readiness import CheckReadiness
from app.presentation.api.dependencies import get_check_readiness
from app.presentation.schemas.health import HealthResponse


async def test_liveness_has_valid_response_and_never_checks_db(
    client: httpx.AsyncClient, application: FastAPI
) -> None:
    probe = AsyncMock(side_effect=AssertionError("Health must not query DB"))
    application.state.database.ping = probe
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert HealthResponse.model_validate(response.json()).status == "ok"
    assert response.json()["service"] == "Action Quiz API"
    probe.assert_not_called()


async def test_factory_and_openapi(client: httpx.AsyncClient) -> None:
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Action Quiz API"
    assert set(schema["paths"]) == {"/api/v1/health", "/api/v1/ready"}
    assert (await client.get("/docs")).status_code == 200


async def test_ready_success(client: httpx.AsyncClient, application: FastAPI) -> None:
    probe = AsyncMock()
    probe.ping.return_value = True
    application.dependency_overrides[get_check_readiness] = lambda: CheckReadiness(probe)
    response = await client.get("/api/v1/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "up"}
    probe.ping.assert_awaited_once()


async def test_ready_unavailable(client: httpx.AsyncClient, application: FastAPI) -> None:
    probe = AsyncMock()
    probe.ping.return_value = False
    application.dependency_overrides[get_check_readiness] = lambda: CheckReadiness(probe)
    response = await client.get("/api/v1/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "not_ready", "database": "unavailable"}


async def test_cors_only_allows_configured_origin(client: httpx.AsyncClient) -> None:
    allowed = await client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:3000"
    denied = await client.get("/api/v1/health", headers={"Origin": "https://untrusted.example"})
    assert "access-control-allow-origin" not in denied.headers


async def test_error_handlers_do_not_leak_driver_or_internal_details(
    client: httpx.AsyncClient, application: FastAPI
) -> None:
    @application.get("/test-database-error")
    async def database_failure() -> None:
        raise SQLAlchemyError("postgresql://private-password@internal")

    @application.get("/test-internal-error")
    async def internal_failure() -> None:
        raise RuntimeError("private-password")

    @application.get("/test-validation")
    async def validation(count: int) -> dict[str, int]:
        return {"count": count}

    for path, expected in [
        ("/test-database-error", 503),
        ("/test-internal-error", 500),
        ("/test-validation?count=private-password", 422),
        ("/missing", 404),
    ]:
        response = await client.get(path)
        assert response.status_code == expected
        assert "private-password" not in response.text
        assert set(response.json()["error"]) == {"code", "message"}
