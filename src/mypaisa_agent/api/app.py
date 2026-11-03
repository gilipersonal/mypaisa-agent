"""The FastAPI application, built by a factory so each test, handler and the local stack gets its own.

    uv run uvicorn mypaisa_agent.api.app:create_app --factory --reload

The Lambda handlers (`api` on Mangum, `stream` on Uvicorn behind the Lambda Web Adapter), the correlation
middleware and OpenTelemetry arrive with MA-266; they wrap this app, they do not change it.
"""

from collections.abc import Sequence

from fastapi import FastAPI

from mypaisa_agent.api import problems
from mypaisa_agent.api.routers import health
from mypaisa_agent.core.config import Settings, get_settings
from mypaisa_agent.repositories.probes import ReadinessProbe


def create_app(settings: Settings | None = None, probes: Sequence[ReadinessProbe] = ()) -> FastAPI:
    settings = settings or get_settings()
    hide_docs = settings.environment == "prod"
    app = FastAPI(
        title="MyPaisa API",
        version=settings.version,
        docs_url=None if hide_docs else "/docs",
        redoc_url=None,
        openapi_url=None if hide_docs else "/openapi.json",
    )
    app.state.settings = settings  # the one Settings every dependency reads (api/deps.py)
    app.state.probes = tuple(probes)
    problems.install(app)
    app.include_router(health.router)
    return app
