from typing import cast

from fastapi import Request

from app.application.readiness import CheckReadiness, DatabaseProbe


def get_check_readiness(request: Request) -> CheckReadiness:
    return CheckReadiness(cast(DatabaseProbe, request.app.state.database))
