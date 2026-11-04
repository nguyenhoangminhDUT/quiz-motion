from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.application.readiness import CheckReadiness
from app.presentation.api.dependencies import get_check_readiness
from app.presentation.schemas.health import HealthResponse, ReadinessResponse

router = APIRouter(tags=["Operations"])


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    return HealthResponse(status="ok", service=request.app.state.settings.app_name)


@router.get(
    "/ready", response_model=ReadinessResponse, responses={503: {"model": ReadinessResponse}}
)
async def ready(
    response: Response,
    check: Annotated[CheckReadiness, Depends(get_check_readiness)],
) -> ReadinessResponse:
    if await check.execute():
        return ReadinessResponse(status="ready", database="up")
    response.status_code = 503
    return ReadinessResponse(status="not_ready", database="unavailable")
