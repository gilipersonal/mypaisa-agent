"""One local ASGI app: the real `create_app` with the stand-ins for what phase 1 builds, behind a loopback-only gate.

The routes speak the wire ARCHITECTURE §19.5 and §19.1 fix, so a door written against them meets MA-30 and MA-31
unchanged.
"""

import asyncio
import json
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Cookie, Depends, FastAPI, Header, Query, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from local import config
from local.agents import Agent
from local.aws import Stack
from local.pipeline import Pipeline
from local.streamlog import StreamLog
from mypaisa_agent.api.app import create_app
from mypaisa_agent.core.config import Settings

COOKIE = "mp_local_session"
TOKEN_PREFIX = "local."  # noqa: S105 - marks a stub session, which is not a secret
PROBLEM_JSON = "application/problem+json"


class SignIn(BaseModel):
    member: str


class Session(BaseModel):
    token: str
    member: str
    role: str


class NewMessage(BaseModel):
    client_id: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    text: str = Field(min_length=1, max_length=4000)


class Accepted(BaseModel):
    client_id: str


def problem(code: str, title: str, http_status: int) -> JSONResponse:
    body = {"type": f"https://mypaisapp.com/problems#{code}", "title": title, "status": http_status, "detail": title}
    return JSONResponse(body, status_code=http_status, media_type=PROBLEM_JSON)


class UnauthorisedError(Exception):
    """No stub session on the request."""


def member_from(token: str | None) -> str:
    member = (token or "").removeprefix(TOKEN_PREFIX)
    if not (token or "").startswith(TOKEN_PREFIX) or member not in config.MEMBERS:
        raise UnauthorisedError
    return member


def current_member(
    authorization: Annotated[str | None, Header()] = None,
    session: Annotated[str | None, Cookie(alias=COOKIE)] = None,
) -> str:
    return member_from(authorization.removeprefix("Bearer ") if authorization else session)


@dataclass(frozen=True)
class Parts:
    log: StreamLog
    pipeline: Pipeline
    pacing: config.Pacing


def frame(event: str, data: dict[str, Any], event_id: int | None = None) -> str:
    head = f"id: {event_id}\n" if event_id is not None else ""
    return f"{head}event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def stream_events(parts: Parts, member: str, after: int) -> AsyncIterator[str]:
    """§19.5 in order: what the log holds after the door's last event, then each turn's words as they arrive."""
    log, pacing = parts.log, parts.pacing
    yield "retry: 2000\n\n"
    last = after
    if last > await asyncio.to_thread(log.head, member):
        yield frame("resync", {})
        last = 0
    sent = ""
    loop = asyncio.get_running_loop()
    started = beat = loop.time()
    while loop.time() - started < pacing.max_stream_s:
        for event in await asyncio.to_thread(log.after, member, last):
            last = event.seq
            sent = ""
            yield frame(event.kind, event.data, event.seq)
        live = await asyncio.to_thread(log.live, member)
        if live and live.text.startswith(sent) and live.text != sent:
            yield frame("delta", {"turn_id": live.turn_id, "text": live.text[len(sent) :]})
            sent = live.text
        if loop.time() - beat >= pacing.heartbeat_s:
            beat = loop.time()
            yield ": heartbeat\n\n"
        await asyncio.sleep(pacing.active_poll_s if live else pacing.idle_poll_s)
    yield "retry: 0\n\n"


def resume_point(after: int | None, last_event_id: str | None) -> int:
    if last_event_id is not None and last_event_id.isdecimal():
        return int(last_event_id)
    return after or 0


def create_local_app(stack: Stack, agent: Agent, pacing: config.Pacing | None = None) -> FastAPI:
    pacing = pacing or config.Pacing()
    log = StreamLog(stack)
    parts = Parts(log=log, pipeline=Pipeline(stack, log, agent, pacing), pacing=pacing)
    app = create_app(Settings(environment="local"))

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
        task = asyncio.create_task(parts.pipeline.run())
        yield
        task.cancel()

    app.router.lifespan_context = lifespan

    @app.middleware("http")
    async def loopback_only(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Answers only this machine, by peer and by Host, so a page elsewhere cannot rebind its way in."""
        peer = request.client.host if request.client else None
        host = request.url.hostname
        if not config.is_loopback(peer) or not config.is_loopback(host):
            return problem("forbidden", "The local stack answers only on this machine.", status.HTTP_403_FORBIDDEN)
        return await call_next(request)

    @app.exception_handler(UnauthorisedError)
    async def unauthorised(_: Request, __: Exception) -> JSONResponse:
        return problem("unauthorised", "Sign in first.", status.HTTP_401_UNAUTHORIZED)

    @app.post("/v1/auth/local", tags=["local"])
    async def sign_in(body: SignIn, response: Response) -> Session:
        if body.member not in config.MEMBERS:
            raise UnauthorisedError
        token = f"{TOKEN_PREFIX}{body.member}"
        response.set_cookie(COOKIE, token, httponly=True, samesite="strict")
        return Session(token=token, member=body.member, role=config.MEMBERS[body.member])

    @app.post("/v1/chat/messages", status_code=status.HTTP_202_ACCEPTED, tags=["local"])
    async def post_message(body: NewMessage, member: Annotated[str, Depends(current_member)]) -> Accepted:
        await asyncio.to_thread(parts.pipeline.accept, member, body.client_id, body.text)
        return Accepted(client_id=body.client_id)

    @app.get("/v1/stream", tags=["local"])
    async def stream(
        member: Annotated[str, Depends(current_member)],
        after: Annotated[int | None, Query(ge=0)] = None,
        last_event_id: Annotated[str | None, Header()] = None,
    ) -> StreamingResponse:
        return StreamingResponse(
            stream_events(parts, member, resume_point(after, last_event_id)),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
        )

    return app
