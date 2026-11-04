"""Read-only local verification; does not create or delete tables."""

import asyncio

from sqlalchemy import text

from app.core.config import Settings
from app.infrastructure.database import Database


async def main() -> None:
    database = Database(Settings())
    try:
        async with database.engine.connect() as connection:
            value = (await connection.execute(text("SELECT 1"))).scalar_one()
            revision = (
                await connection.execute(text("SELECT version_num FROM alembic_version"))
            ).scalar_one()
            print(f"SELECT 1 = {value}; Alembic revision = {revision}")
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(main())
