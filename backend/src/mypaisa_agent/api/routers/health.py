from fastapi import APIRouter, Response, status

from mypaisa_agent.api.deps import HealthServiceDep
from mypaisa_agent.api.schemas.health import LivenessOut, ReadinessOut

router = APIRouter(prefix="/v1/health", tags=["health"])


@router.get("", summary="The process is up")
async def liveness(service: HealthServiceDep) -> LivenessOut:
    settings = service.liveness()
    return LivenessOut(version=settings.version, environment=settings.environment)


@router.get(
    "/ready",
    summary="Every dependency the app needs answers",
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessOut}},
)
async def readiness(service: HealthServiceDep, response: Response) -> ReadinessOut:
    result = await service.readiness()
    if not result.ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessOut(status="ready" if result.ready else "not_ready", checks=result.checks)
