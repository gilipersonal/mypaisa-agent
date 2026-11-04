"""The two agents the local stack can run: a replay of recorded conversations, or Claude on the dev key.

The recordings are also the evals' T0 layer (MA-246): the same files replayed through the real loop and its guards once
MA-271 builds it. Claude here is a plain streamed reply and nothing more, with no tools, so no figure can come from it.
"""

import asyncio
import json
from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

RECORDINGS = Path(__file__).parent / "recordings"
NO_RECORDING = "There is no recording for that message, so the scripted agent has nothing to say."
REFUSED = "That request was declined."
# Claude Opus 5.5 is the default until the agents' routing (ARCHITECTURE §7) arrives with MA-271.
CLAUDE_MODEL = "claude-opus-5-5"
CLAUDE_BETA = "server-side-fallback-2026-07-01"
CLAUDE_MAX_TOKENS = 8000
CLAUDE_SYSTEM = (
    "You are MyPaisa, running on a developer's laptop. You have no access to the household's records yet, so never "
    "state or estimate a figure. Answer in one or two plain sentences."
)


@dataclass(frozen=True)
class Reply:
    """A turn's text as it was written, and the cards that end it."""

    deltas: Sequence[str]
    cards: Sequence[Mapping[str, Any]] = ()


class Agent(Protocol):
    """One turn: text as it arrives, then at most one final list of cards."""

    def reply(self, member: str, text: str) -> AsyncIterator[str]: ...

    def cards(self, text: str) -> Sequence[Mapping[str, Any]]: ...


def normalise(text: str) -> str:
    return " ".join(text.lower().split())


def load_recordings(folder: Path = RECORDINGS) -> dict[str, Reply]:
    """Every turn of every recording, by what the member said. A file that cannot be read is a failure, never a skip."""
    turns: dict[str, Reply] = {}
    files = sorted(folder.glob("*.json"))
    if not files:
        message = f"no recordings in {folder}"
        raise ValueError(message)
    for path in files:
        recording = json.loads(path.read_text(encoding="utf-8"))
        for turn in recording["turns"]:
            key = normalise(turn["user"])
            if key in turns:
                message = f"{path.name}: two recordings answer {turn['user']!r}"
                raise ValueError(message)
            turns[key] = Reply(deltas=tuple(turn["agent"]["deltas"]), cards=tuple(turn["agent"].get("cards", ())))
    return turns


class ScriptedAgent:
    """Replays recorded conversations. No network, no key, the same words every time."""

    def __init__(self, turns: Mapping[str, Reply] | None = None, delay_s: float = 0.05) -> None:
        self._turns = turns if turns is not None else load_recordings()
        self._delay_s = delay_s

    async def reply(self, member: str, text: str) -> AsyncIterator[str]:
        _ = member
        found = self._turns.get(normalise(text))
        for delta in found.deltas if found else (NO_RECORDING,):
            await asyncio.sleep(self._delay_s)
            yield delta

    def cards(self, text: str) -> Sequence[Mapping[str, Any]]:
        found = self._turns.get(normalise(text))
        return found.cards if found else ()


class ClaudeAgent:
    """Claude on the dev key, for trying a real reply. Spends money, so it runs only when asked (`--agent claude`).

    The client is passed in: `run.py` builds it with the key it reads from SSM, and tests pass a fake. No test calls
    the API.
    """

    def __init__(self, client: Any, model: str = CLAUDE_MODEL) -> None:  # noqa: ANN401 - the SDK's client or a fake
        self._client = client
        self._model = model

    async def reply(self, member: str, text: str) -> AsyncIterator[str]:
        _ = member
        async with self._client.beta.messages.stream(
            model=self._model,
            max_tokens=CLAUDE_MAX_TOKENS,
            system=CLAUDE_SYSTEM,
            output_config={"effort": "low"},
            betas=[CLAUDE_BETA],
            fallbacks="default",
            messages=[{"role": "user", "content": text}],
        ) as stream:
            async for piece in stream.text_stream:
                yield piece
            final = await stream.get_final_message()
        if final.stop_reason == "refusal":
            yield REFUSED

    def cards(self, text: str) -> Sequence[Mapping[str, Any]]:
        _ = text
        return ()
