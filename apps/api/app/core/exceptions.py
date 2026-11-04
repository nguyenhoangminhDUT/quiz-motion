import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


def error_response(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, _exc: RequestValidationError) -> JSONResponse:
        return error_response(422, "validation_error", "Invalid request.")

    @app.exception_handler(HTTPException)
    async def http_error(_: Request, exc: HTTPException) -> JSONResponse:
        return error_response(exc.status_code, "http_error", HTTPStatus(exc.status_code).phrase)

    @app.exception_handler(SQLAlchemyError)
    async def database_error(_: Request, _exc: SQLAlchemyError) -> JSONResponse:
        return error_response(503, "database_unavailable", "Database temporarily unavailable.")

    @app.exception_handler(Exception)
    async def internal_error(_: Request, exc: Exception) -> JSONResponse:
        logger.error("Unhandled internal exception: %s", type(exc).__name__)
        return error_response(500, "internal_error", "Internal server error.")
