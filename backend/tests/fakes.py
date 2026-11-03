"""In-memory stand-ins for the repository ports, so a service is tested with no AWS."""

import asyncio
from dataclasses import dataclass


@dataclass(frozen=True)
class FakeProbe:
    name: str
    fails: bool = False
    delay_s: float = 0.0

    async def check(self) -> None:
        if self.delay_s:
            await asyncio.sleep(self.delay_s)
        if self.fails:
            msg = f"{self.name} unreachable"
            raise ConnectionError(msg)
