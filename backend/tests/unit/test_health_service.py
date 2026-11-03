import pytest

from mypaisa_agent.core.config import Settings
from mypaisa_agent.domain.health import CheckStatus
from mypaisa_agent.repositories.probes import ReadinessProbe
from mypaisa_agent.services.health import HealthService
from tests.fakes import FakeProbe

pytestmark = pytest.mark.anyio


def test_a_fake_probe_meets_the_port() -> None:
    assert isinstance(FakeProbe("table"), ReadinessProbe)


def test_liveness_asks_nothing_outside(settings: Settings) -> None:
    assert HealthService(settings, [FakeProbe("table", fails=True)]).liveness() is settings


async def test_ready_with_no_probes(settings: Settings) -> None:
    result = await HealthService(settings).readiness()
    assert result.ready
    assert result.checks == ()


async def test_ready_only_when_every_probe_passes(settings: Settings) -> None:
    service = HealthService(settings, [FakeProbe("table"), FakeProbe("bucket", fails=True)])
    result = await service.readiness()
    assert not result.ready
    by_name = {c.name: c for c in result.checks}
    assert by_name["table"].status is CheckStatus.PASS
    assert by_name["bucket"].status is CheckStatus.FAIL
    assert by_name["bucket"].detail == "ConnectionError"


async def test_a_slow_probe_times_out_and_fails() -> None:
    settings = Settings(readiness_timeout_s=0.01)
    result = await HealthService(settings, [FakeProbe("queue", delay_s=1)]).readiness()
    (check,) = result.checks
    assert check.status is CheckStatus.FAIL
    assert check.detail == "timed out"
