"""Liveness and readiness, for the load balancer, the smoke runner (MA-268) and the doors."""

import asyncio
import time
from collections.abc import Sequence

from mypaisa_agent.core.config import Settings
from mypaisa_agent.domain.health import CheckResult, CheckStatus, Readiness
from mypaisa_agent.repositories.probes import ReadinessProbe


class HealthService:
    def __init__(self, settings: Settings, probes: Sequence[ReadinessProbe] = ()) -> None:
        self._settings = settings
        self._probes = tuple(probes)

    def liveness(self) -> Settings:
        """The process is up; nothing outside it is asked."""
        return self._settings

    async def readiness(self) -> Readiness:
        """Every probe at once, each within the timeout; a probe that raises or runs over fails."""
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(self._run(p)) for p in self._probes]
        return Readiness(checks=tuple(t.result() for t in tasks))

    async def _run(self, probe: ReadinessProbe) -> CheckResult:
        start = time.perf_counter()
        try:
            async with asyncio.timeout(self._settings.readiness_timeout_s):
                await probe.check()
        except TimeoutError:
            status, detail = CheckStatus.FAIL, "timed out"
        except Exception as e:  # noqa: BLE001 - any failure of a dependency is a failed check, never a crash
            status, detail = CheckStatus.FAIL, type(e).__name__
        else:
            status, detail = CheckStatus.PASS, None
        elapsed = (time.perf_counter() - start) * 1000
        return CheckResult(name=probe.name, status=status, duration_ms=round(elapsed, 2), detail=detail)
