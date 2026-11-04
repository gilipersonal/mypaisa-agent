# pyright: basic, reportTypedDictNotRequiredAccess=false
"""The turn's road, as ARCHITECTURE §19.1 draws it: updates.fifo, the agent, outbox.fifo, the sender, the stream log.

One lane per member (the FIFO message group), so a member's messages run one at a time and in order; the door's client
id is the deduplication id, so a resend is harmless.
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Any

from local import config
from local.agents import Agent
from local.aws import Stack
from local.streamlog import StreamLog

logger = logging.getLogger("mypaisa.local")
CARD_SCHEMA_VERSION = 1
FAILED = "MyPaisa could not answer that. Your message was kept."


class Pipeline:
    def __init__(self, stack: Stack, log: StreamLog, agent: Agent, pacing: config.Pacing) -> None:
        self._stack = stack
        self._log = log
        self._agent = agent
        self._pacing = pacing

    def accept(self, member: str, client_id: str, text: str) -> None:
        """What the chat api does: queue the message and return, so the door never waits on the agent."""
        self._stack.sqs.send_message(
            QueueUrl=self._stack.updates_url,
            MessageBody=json.dumps({"member": member, "client_id": client_id, "text": text}, ensure_ascii=False),
            MessageGroupId=member,
            MessageDeduplicationId=client_id,
        )

    async def run(self) -> None:
        async with asyncio.TaskGroup() as group:
            group.create_task(self._consume(self._stack.updates_url, self._turn))
            group.create_task(self._consume(self._stack.outbox_url, self._send))

    async def _consume(self, queue_url: str, handle: Any) -> None:  # noqa: ANN401 - one of the two handlers below
        while True:
            received = await asyncio.to_thread(
                self._stack.sqs.receive_message, QueueUrl=queue_url, MaxNumberOfMessages=1, WaitTimeSeconds=1
            )
            for message in received.get("Messages", []):
                await handle(json.loads(message["Body"]))
                await asyncio.to_thread(
                    self._stack.sqs.delete_message, QueueUrl=queue_url, ReceiptHandle=message["ReceiptHandle"]
                )

    async def _turn(self, update: dict[str, str]) -> None:
        member, client_id, text = update["member"], update["client_id"], update["text"]
        run_id, trace_id = uuid.uuid4().hex, uuid.uuid4().hex
        written = ""
        flushed_at = 0.0
        try:
            async for delta in self._agent.reply(member, text):
                written += delta
                if time.monotonic() - flushed_at >= self._pacing.delta_flush_s:
                    await asyncio.to_thread(self._log.write_live, member, client_id, written)
                    flushed_at = time.monotonic()
            await asyncio.to_thread(self._log.write_live, member, client_id, written)
            cards = list(self._agent.cards(text))
        except Exception:
            logger.exception("the agent failed on a turn")
            written, cards = FAILED, []
        body = {
            "member": member,
            "kind": "message",
            "data": {
                "id": client_id,
                "role": "agent",
                "text": written,
                "cards": cards,
                "run_id": run_id,
                "trace_id": trace_id,
            },
        }
        await asyncio.to_thread(
            self._stack.sqs.send_message,
            QueueUrl=self._stack.outbox_url,
            MessageBody=json.dumps(body, ensure_ascii=False),
            MessageGroupId=member,
            MessageDeduplicationId=run_id,
        )

    async def _send(self, outgoing: dict[str, Any]) -> None:
        member = outgoing["member"]
        await asyncio.to_thread(self._log.append, member, outgoing["kind"], outgoing["data"])
        await asyncio.to_thread(self._log.clear_live, member)
