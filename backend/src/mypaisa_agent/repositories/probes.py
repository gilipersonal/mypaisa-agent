"""The readiness port: each adapter that the app cannot serve without says whether it can be reached."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class ReadinessProbe(Protocol):
    """A dependency's reachability check. `check` returns normally when reachable and raises when not."""

    @property
    def name(self) -> str: ...

    async def check(self) -> None: ...
