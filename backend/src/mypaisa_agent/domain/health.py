"""What a health check reports."""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class CheckStatus(StrEnum):
    PASS = "pass"  # noqa: S105 - a status, not a password
    FAIL = "fail"


class CheckResult(BaseModel):
    """One dependency's answer to a readiness probe."""

    model_config = ConfigDict(frozen=True)

    name: str
    status: CheckStatus
    duration_ms: float = Field(ge=0)
    detail: str | None = None


class Readiness(BaseModel):
    """Every dependency's answer; ready only when each passed."""

    model_config = ConfigDict(frozen=True)

    checks: tuple[CheckResult, ...] = ()

    @property
    def ready(self) -> bool:
        return all(c.status is CheckStatus.PASS for c in self.checks)
