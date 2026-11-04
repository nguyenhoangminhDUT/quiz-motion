from typing import Protocol


class DatabaseProbe(Protocol):
    async def ping(self) -> bool:
        """Return connectivity only; never leak driver diagnostics to HTTP clients."""


class CheckReadiness:
    def __init__(self, database: DatabaseProbe) -> None:
        self.database = database

    async def execute(self) -> bool:
        return await self.database.ping()
