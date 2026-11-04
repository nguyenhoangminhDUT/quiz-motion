import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings

logger = logging.getLogger(__name__)


class Database:
    def __init__(self, settings: Settings) -> None:
        self.engine = create_async_engine(
            settings.database_url.get_secret_value(),
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=5,
            pool_timeout=3,
            connect_args={"timeout": 3, "command_timeout": 3},
        )
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def ping(self) -> bool:
        try:
            async with asyncio.timeout(3), self.engine.connect() as connection:
                return (await connection.execute(text("SELECT 1"))).scalar_one() == 1
        except (SQLAlchemyError, OSError, TimeoutError) as exc:
            logger.warning("Database readiness unavailable: %s", type(exc).__name__)
            return False

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        # begin() commits on successful scope exit, rolls back on exceptions.
        async with self.sessions() as session, session.begin():
            yield session

    async def dispose(self) -> None:
        await self.engine.dispose()
