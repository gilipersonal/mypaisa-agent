from typing import Literal

from pydantic import BaseModel, ConfigDict

from mypaisa_agent.core.config import Environment
from mypaisa_agent.domain.health import CheckResult


class LivenessOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: Literal["ok"] = "ok"
    version: str
    environment: Environment


class ReadinessOut(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: Literal["ready", "not_ready"]
    checks: tuple[CheckResult, ...]
