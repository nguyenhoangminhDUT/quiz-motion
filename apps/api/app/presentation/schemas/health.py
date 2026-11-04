from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str


class ReadinessResponse(BaseModel):
    status: Literal["ready", "not_ready"]
    database: Literal["up", "unavailable"]
