from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings
from app.core.exceptions import register_exception_handlers
from app.infrastructure.database import Database
from app.presentation.api.routers.health import router


def create_app(settings: Settings | None = None) -> FastAPI:
    config = settings if settings is not None else Settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        # Engine construction is lazy: liveness works with an unavailable DB.
        database = Database(config)
        application.state.database = database
        try:
            yield
        finally:
            await database.dispose()

    application = FastAPI(
        title=config.app_name, version="0.1.0", docs_url="/docs", lifespan=lifespan
    )
    application.state.settings = config
    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
    )
    register_exception_handlers(application)
    application.include_router(router, prefix="/api/v1")
    return application


app = create_app()
