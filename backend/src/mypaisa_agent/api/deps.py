"""Dependency wiring: how each controller gets its service. Everything comes from the app the request reached,
so a test builds an app with its own settings and probes, or swaps a provider through
`app.dependency_overrides`."""

from typing import Annotated

from fastapi import Depends, Request

from mypaisa_agent.core.config import Settings
from mypaisa_agent.repositories.probes import ReadinessProbe
from mypaisa_agent.services.health import HealthService


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_probes(request: Request) -> tuple[ReadinessProbe, ...]:
    probes: tuple[ReadinessProbe, ...] = request.app.state.probes
    return probes


def get_health_service(
    settings: Annotated[Settings, Depends(get_settings)],
    probes: Annotated[tuple[ReadinessProbe, ...], Depends(get_probes)],
) -> HealthService:
    return HealthService(settings, probes)


HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]
