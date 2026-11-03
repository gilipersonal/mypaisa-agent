"""Settings, read once from the environment.

Every value comes from a `MYPAISA_` environment variable or its default. A secret never lives here: code reads
it from SSM at run time (CLAUDE.md, ARCHITECTURE §13).
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from mypaisa_agent import __version__

type Environment = Literal["local", "dev", "prod"]


class Settings(BaseSettings):
    """The process's settings. Frozen: nothing changes them after start."""

    model_config = SettingsConfigDict(env_prefix="MYPAISA_", frozen=True, extra="ignore")

    environment: Environment = "local"
    version: str = __version__
    readiness_timeout_s: float = Field(default=2.0, gt=0, le=30)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
