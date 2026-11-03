from http import HTTPStatus

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from mypaisa_agent.api.app import create_app
from mypaisa_agent.api.problems import PROBLEM_JSON, status_of
from mypaisa_agent.core.config import Settings
from mypaisa_agent.core.errors import ConflictError, MyPaisaError, NotFoundError

pytestmark = pytest.mark.anyio


class StaleVersionError(ConflictError):
    code = "stale_version"


def app_raising(exc: Exception, settings: Settings) -> FastAPI:
    app = create_app(settings)

    @app.get("/v1/boom")
    async def boom() -> None:
        raise exc

    @app.get("/v1/items/{item_id}")
    async def item(item_id: int) -> int:
        return item_id

    return app


async def get(app: FastAPI, path: str) -> tuple[int, str, dict[str, object]]:
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get(path)
    return r.status_code, r.headers["content-type"], r.json()


@pytest.mark.parametrize(
    ("exc", "status", "code"),
    [
        (NotFoundError("No such holding."), 404, "not_found"),
        (StaleVersionError("The record changed; read it again."), 409, "stale_version"),
        (MyPaisaError("Unmapped."), 500, "error"),
    ],
)
async def test_a_service_error_is_a_problem(exc: MyPaisaError, status: int, code: str, settings: Settings) -> None:
    got, ctype, body = await get(app_raising(exc, settings), "/v1/boom")
    assert got == status
    assert ctype == PROBLEM_JSON
    assert body["type"] == f"about:blank#{code}"
    assert body["detail"] == exc.detail


async def test_an_unexpected_error_says_nothing_about_itself(settings: Settings) -> None:
    got, _, body = await get(app_raising(RuntimeError("secret table name"), settings), "/v1/boom")
    assert got == 500
    assert "secret" not in str(body)


async def test_an_invalid_request_lists_what_is_wrong(settings: Settings) -> None:
    got, ctype, body = await get(app_raising(RuntimeError(), settings), "/v1/items/abc")
    assert got == 422
    assert ctype == PROBLEM_JSON
    assert body["type"] == "about:blank#invalid_request"
    assert body["errors"]


def test_a_subclass_takes_its_parents_status() -> None:
    assert status_of(StaleVersionError("x")) is HTTPStatus.CONFLICT


async def test_an_unknown_route_is_a_problem_too(client: AsyncClient) -> None:
    r = await client.get("/v1/no-such-thing")
    assert r.status_code == 404
    assert r.headers["content-type"] == PROBLEM_JSON
    assert r.json()["type"] == "about:blank#not_found"


async def test_a_wrong_method_is_a_problem_too(client: AsyncClient) -> None:
    r = await client.post("/v1/health")
    assert r.status_code == 405
    assert r.json()["type"] == "about:blank#method_not_allowed"
