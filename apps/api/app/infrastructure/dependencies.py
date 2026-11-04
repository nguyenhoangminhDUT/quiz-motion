from collections.abc import AsyncIterator
from typing import cast

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import Database


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    database = cast(Database, request.app.state.database)
    async with database.session() as session:
        yield session
