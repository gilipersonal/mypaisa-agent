import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from mypaisa_agent.api.app import create_app
from mypaisa_agent.core.config import Settings
from tests.fakes import FakeProbe

pytestmark = pytest.mark.anyio


async def test_liveness(client: AsyncClient) -> None:
    r = await client.get("/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "version": "0.0.0-test", "environment": "local"}


async def test_ready_with_no_dependencies(client: AsyncClient) -> None:
    r = await client.get("/v1/health/ready")
    assert r.status_code == 200
    assert r.json() == {"status": "ready", "checks": []}


async def test_not_ready_is_a_503_naming_the_failed_check(settings: Settings) -> None:
    app = create_app(settings, probes=[FakeProbe("table"), FakeProbe("bucket", fails=True)])
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        r = await c.get("/v1/health/ready")
    assert r.status_code == 503
    body = r.json()
    assert body["status"] == "not_ready"
    assert {c["name"]: c["status"] for c in body["checks"]} == {"table": "pass", "bucket": "fail"}


def test_prod_hides_the_docs_and_the_schema() -> None:
    app = create_app(Settings(environment="prod"))
    paths = {getattr(r, "path", "") for r in app.routes}
    assert "/docs" not in paths
    assert "/openapi.json" not in paths


def test_every_route_is_versioned(app: FastAPI) -> None:
    api_paths = list(app.openapi()["paths"])
    assert api_paths
    assert all(p.startswith("/v1/") for p in api_paths)
