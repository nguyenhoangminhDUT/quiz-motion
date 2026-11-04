from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.readiness import CheckReadiness
from app.core.config import Settings
from app.infrastructure.database import Database
from app.infrastructure.dependencies import get_session


async def test_use_case_accepts_protocol_implementation() -> None:
    probe = AsyncMock()
    probe.ping.return_value = True
    assert await CheckReadiness(probe).execute() is True
    probe.ping.assert_awaited_once()


async def test_session_dependency_closes_transaction_on_success_and_error(
    settings: Settings,
) -> None:
    database = Database(settings)
    request = Request(
        {"type": "http", "app": SimpleNamespace(state=SimpleNamespace(database=database))}
    )
    try:
        dependency = get_session(request)
        session = await anext(dependency)
        assert isinstance(session, AsyncSession)
        assert session.in_transaction()
        with pytest.raises(StopAsyncIteration):
            await anext(dependency)
        assert not session.in_transaction()

        failing = get_session(request)
        session = await anext(failing)
        with pytest.raises(RuntimeError, match="application failure"):
            await failing.athrow(RuntimeError("application failure"))
        assert not session.in_transaction()
    finally:
        await database.dispose()
