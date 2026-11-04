"""The local stack end to end over real sockets: moto, Uvicorn, the pipeline and the stream (MA-198)."""

import asyncio
import json
import socket
import threading
import time
from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Self

import httpx
import pytest
import uvicorn
from fastapi.testclient import TestClient

from local import aws, config
from local.agents import NO_RECORDING, REFUSED, ClaudeAgent, Reply, ScriptedAgent, load_recordings
from local.app import UnauthorisedError, create_local_app, member_from, resume_point
from mypaisa_agent.api.app import create_app

FAST = config.Pacing(active_poll_s=0.02, idle_poll_s=0.02, delta_flush_s=0.0, heartbeat_s=0.05)
HELLO = "Hello, I'm MyPaisa. This reply came from a recording."


def free_port() -> int:
    with socket.socket() as probe:
        probe.bind((config.HOST, 0))
        return int(probe.getsockname()[1])


@dataclass
class Running:
    url: str
    stack: aws.Stack


@pytest.fixture(scope="module")
def moto_endpoint() -> Iterator[str]:
    port = free_port()
    server = aws.start_moto(port)
    yield f"http://{config.HOST}:{port}"
    server.stop()


@pytest.fixture
def running(moto_endpoint: str) -> Iterator[Running]:
    httpx.post(f"{moto_endpoint}/moto-api/reset", timeout=5).raise_for_status()
    stack = aws.connect(moto_endpoint)
    app = create_local_app(stack, ScriptedAgent(delay_s=0.01), FAST)
    port = free_port()
    server = uvicorn.Server(uvicorn.Config(app, host=config.HOST, port=port, log_level="error"))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    deadline = time.monotonic() + 10
    while not server.started and time.monotonic() < deadline:
        time.sleep(0.01)
    assert server.started
    yield Running(f"http://{config.HOST}:{port}", stack)
    server.should_exit = True
    server.force_exit = True
    thread.join(timeout=5)


def sign_in(client: httpx.Client, member: str = "owner_arun") -> dict[str, str]:
    response = client.post("/v1/auth/local", json={"member": member})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


def read_until(
    client: httpx.Client, headers: dict[str, str], stop: str, path: str = "/v1/stream"
) -> list[dict[str, Any]]:
    """The stream's frames, parsed, up to and including the first of kind `stop`."""
    frames: list[dict[str, Any]] = []
    current: dict[str, Any] = {}
    with client.stream("GET", path, headers=headers, timeout=10) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        for line in response.iter_lines():
            if not line:
                if "event" in current:
                    frames.append(current)
                    if current["event"] == stop:
                        return frames
                current = {}
            elif line.startswith("id: "):
                current["id"] = int(line[4:])
            elif line.startswith("event: "):
                current["event"] = line[7:]
            elif line.startswith("data: "):
                current["data"] = json.loads(line[6:])
    return frames


def test_the_journey_signs_in_sends_and_streams_the_reply(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        headers = sign_in(client)
        accepted = client.post("/v1/chat/messages", headers=headers, json={"client_id": "c1", "text": "Hello"})
        assert accepted.status_code == 202
        frames = read_until(client, headers, "message")
    message = frames[-1]
    assert message["id"] == 1
    assert message["data"]["text"] == HELLO
    assert message["data"]["cards"][0]["type"] == "note"
    assert message["data"]["run_id"]
    assert message["data"]["trace_id"]
    words = "".join(f["data"]["text"] for f in frames if f["event"] == "delta")
    assert HELLO.startswith(words)


def test_the_words_arrive_before_the_finished_message(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        headers = sign_in(client)
        client.post("/v1/chat/messages", headers=headers, json={"client_id": "c1", "text": "Hello"})
        frames = read_until(client, headers, "message")
    assert frames[0]["event"] == "delta"


def test_a_resend_with_the_same_client_id_is_answered_once(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        headers = sign_in(client)
        for _ in range(2):
            client.post("/v1/chat/messages", headers=headers, json={"client_id": "same", "text": "Hello"})
        read_until(client, headers, "message")
        client.post("/v1/chat/messages", headers=headers, json={"client_id": "next", "text": "Hello"})
        frames = read_until(client, headers, "message", "/v1/stream?after=1")
    assert [f["id"] for f in frames if f["event"] == "message"] == [2]
    assert frames[-1]["data"]["id"] == "next"


def test_a_door_resumes_from_its_last_event_and_gets_nothing_twice(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        headers = sign_in(client)
        client.post("/v1/chat/messages", headers=headers, json={"client_id": "c1", "text": "Hello"})
        read_until(client, headers, "message")
        client.post("/v1/chat/messages", headers=headers, json={"client_id": "c2", "text": "Hello"})
        frames = read_until(client, {**headers, "Last-Event-ID": "1"}, "message")
    assert [f["id"] for f in frames if f["event"] == "message"] == [2]


def test_a_door_ahead_of_the_log_is_told_to_resync(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        headers = sign_in(client)
        frames = read_until(client, headers, "resync", "/v1/stream?after=99")
    assert frames[0]["event"] == "resync"


def test_one_members_stream_never_carries_anothers_messages(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        arun, asha = sign_in(client), sign_in(client, "member_asha")
        client.post("/v1/chat/messages", headers=arun, json={"client_id": "a1", "text": "Hello"})
        read_until(client, arun, "message")
        client.post("/v1/chat/messages", headers=asha, json={"client_id": "b1", "text": "Hello"})
        frames = read_until(client, asha, "message")
    assert [f["data"]["id"] for f in frames if f["event"] == "message"] == ["b1"]


def test_a_message_with_no_recording_says_so(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        headers = sign_in(client)
        client.post("/v1/chat/messages", headers=headers, json={"client_id": "c1", "text": "Something else"})
        frames = read_until(client, headers, "message")
    assert frames[-1]["data"]["text"] == NO_RECORDING


@pytest.mark.parametrize("path", ["/v1/stream"])
def test_the_stream_refuses_no_session(running: Running, path: str) -> None:
    assert httpx.get(f"{running.url}{path}", timeout=5).status_code == 401


def test_the_chat_refuses_no_session_and_a_forged_token(running: Running) -> None:
    body = {"client_id": "c1", "text": "Hello"}
    assert httpx.post(f"{running.url}/v1/chat/messages", json=body, timeout=5).status_code == 401
    forged = {"Authorization": "Bearer owner_arun"}
    assert httpx.post(f"{running.url}/v1/chat/messages", json=body, headers=forged, timeout=5).status_code == 401


def test_sign_in_refuses_a_member_it_does_not_know(running: Running) -> None:
    response = httpx.post(f"{running.url}/v1/auth/local", json={"member": "nobody"}, timeout=5)
    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")


def test_the_session_cookie_works_and_scripts_cannot_read_it(running: Running) -> None:
    with httpx.Client(base_url=running.url, timeout=10) as client:
        response = client.post("/v1/auth/local", json={"member": "owner_arun"})
        cookie = response.headers["set-cookie"].lower()
        assert "httponly" in cookie
        assert "samesite=strict" in cookie
        sent = client.post("/v1/chat/messages", json={"client_id": "c1", "text": "Hello"})
    assert sent.status_code == 202


def test_the_real_health_route_still_answers(running: Running) -> None:
    assert httpx.get(f"{running.url}/v1/health", timeout=5).json()["environment"] == "local"


def test_a_request_from_off_this_machine_is_refused(moto_endpoint: str) -> None:
    httpx.post(f"{moto_endpoint}/moto-api/reset", timeout=5).raise_for_status()
    app = create_local_app(aws.connect(moto_endpoint), ScriptedAgent(), FAST)
    with TestClient(app, base_url="http://127.0.0.1", client=("203.0.113.9", 4000)) as client:
        assert client.get("/v1/health").status_code == 403


def test_a_page_rebinding_a_name_to_this_machine_is_refused(moto_endpoint: str) -> None:
    httpx.post(f"{moto_endpoint}/moto-api/reset", timeout=5).raise_for_status()
    app = create_local_app(aws.connect(moto_endpoint), ScriptedAgent(), FAST)
    with TestClient(app, base_url="http://evil.example", client=("127.0.0.1", 4000)) as client:
        assert client.get("/v1/health").status_code == 403


def test_no_deployed_app_has_the_stub_or_the_stand_ins() -> None:
    routes = {getattr(r, "path", "") for r in create_app().routes}
    assert not routes & {"/v1/auth/local", "/v1/chat/messages", "/v1/stream"}


def test_the_stack_refuses_any_endpoint_off_this_machine() -> None:
    with pytest.raises(ValueError, match="only to this machine"):
        aws.connect("https://dynamodb.us-east-1.amazonaws.com")


@pytest.mark.parametrize("host", ["10.0.0.1", "example.com", "", None, "localhost.example.com"])
def test_these_are_not_loopback(host: str | None) -> None:
    assert not config.is_loopback(host)


@pytest.mark.parametrize("host", ["127.0.0.1", "::1", "localhost"])
def test_these_are_loopback(host: str) -> None:
    assert config.is_loopback(host)


def test_the_resume_header_wins_over_the_query_and_junk_is_ignored() -> None:
    assert resume_point(3, "7") == 7
    assert resume_point(3, "junk") == 3
    assert resume_point(None, None) == 0


@pytest.mark.parametrize("token", [None, "", "local.", "local.nobody", "owner_arun"])
def test_a_bad_token_is_no_member(token: str | None) -> None:
    with pytest.raises(UnauthorisedError):
        member_from(token)


def test_the_committed_recordings_load() -> None:
    assert "hello" in load_recordings()


def test_a_folder_of_no_recordings_is_a_failure(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="no recordings"):
        load_recordings(tmp_path)


def test_two_recordings_of_one_message_are_a_failure(tmp_path: Path) -> None:
    turn = {"user": "Hi", "agent": {"deltas": ["x"]}}
    for name in ("a", "b"):
        (tmp_path / f"{name}.json").write_text(json.dumps({"turns": [turn]}))
    with pytest.raises(ValueError, match="two recordings"):
        load_recordings(tmp_path)


def test_the_scripted_agent_matches_words_not_spacing_or_case() -> None:
    agent = ScriptedAgent({"hello there": Reply(deltas=("a", "b"))}, delay_s=0)

    async def collect() -> list[str]:
        return [delta async for delta in agent.reply("owner_arun", "  HELLO   there ")]

    assert asyncio.run(collect()) == ["a", "b"]


class FakeStream:
    def __init__(self, stop_reason: str) -> None:
        self.stop_reason = stop_reason

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    @property
    def text_stream(self) -> AsyncIterator[str]:
        async def pieces() -> AsyncIterator[str]:
            yield "Hi"

        return pieces()

    async def get_final_message(self) -> SimpleNamespace:
        return SimpleNamespace(stop_reason=self.stop_reason)


class FakeClient:
    def __init__(self, stop_reason: str) -> None:
        self.request: dict[str, Any] = {}
        self.stop_reason = stop_reason
        self.beta = SimpleNamespace(messages=SimpleNamespace(stream=self._stream))

    def _stream(self, **request: Any) -> FakeStream:
        self.request = request
        return FakeStream(self.stop_reason)


def test_claude_mode_streams_with_the_fallback_on_and_no_tools() -> None:
    fake = FakeClient("end_turn")

    async def collect() -> list[str]:
        return [delta async for delta in ClaudeAgent(fake).reply("owner_arun", "Hello")]

    assert asyncio.run(collect()) == ["Hi"]
    assert fake.request["model"] == "claude-opus-5-5"
    assert fake.request["fallbacks"] == "default"
    assert "tools" not in fake.request
    assert "thinking" not in fake.request


def test_claude_mode_says_when_a_reply_was_refused() -> None:
    async def collect() -> list[str]:
        agent = ClaudeAgent(FakeClient("refusal"))
        return [delta async for delta in agent.reply("owner_arun", "Hello")]

    assert asyncio.run(collect())[-1] == REFUSED
