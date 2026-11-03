"""Errors as HTTP problems (RFC 9457, `application/problem+json`). A service raises a MyPaisaError; this maps
its class to a status. Anything unexpected is a 500 that says nothing about the failure."""

from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from mypaisa_agent.core.errors import (
    ConflictError,
    ForbiddenError,
    MyPaisaError,
    NotFoundError,
    UnavailableError,
)

PROBLEM_JSON = "application/problem+json"

STATUS: dict[type[MyPaisaError], HTTPStatus] = {
    NotFoundError: HTTPStatus.NOT_FOUND,
    ConflictError: HTTPStatus.CONFLICT,
    ForbiddenError: HTTPStatus.FORBIDDEN,
    UnavailableError: HTTPStatus.SERVICE_UNAVAILABLE,
}


def problem(status: HTTPStatus, code: str, detail: str, **extra: object) -> JSONResponse:
    body = {"type": f"about:blank#{code}", "title": status.phrase, "status": status.value, "detail": detail}
    return JSONResponse({**body, **extra}, status_code=status.value, media_type=PROBLEM_JSON)


def status_of(exc: MyPaisaError) -> HTTPStatus:
    for cls in type(exc).__mro__:
        if cls in STATUS:
            return STATUS[cls]
    return HTTPStatus.INTERNAL_SERVER_ERROR


async def on_mypaisa_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, MyPaisaError)  # noqa: S101 - registered for MyPaisaError only
    return problem(status_of(exc), exc.code, exc.detail)


async def on_validation_error(_: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)  # noqa: S101 - registered for RequestValidationError only
    errors = [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return problem(HTTPStatus.UNPROCESSABLE_CONTENT, "invalid_request", "The request is not valid.", errors=errors)


async def on_http_error(_: Request, exc: Exception) -> JSONResponse:
    """FastAPI's and Starlette's own errors (no such route, a method not allowed) as problems too."""
    assert isinstance(exc, HTTPException)  # noqa: S101 - registered for HTTPException only
    status = HTTPStatus(exc.status_code)
    return problem(status, status.phrase.lower().replace(" ", "_"), str(exc.detail))


async def on_unexpected(_: Request, __: Exception) -> JSONResponse:
    return problem(HTTPStatus.INTERNAL_SERVER_ERROR, "internal", "Something went wrong; it has been logged.")


def install(app: FastAPI) -> None:
    app.add_exception_handler(MyPaisaError, on_mypaisa_error)
    app.add_exception_handler(RequestValidationError, on_validation_error)
    app.add_exception_handler(HTTPException, on_http_error)
    app.add_exception_handler(Exception, on_unexpected)
