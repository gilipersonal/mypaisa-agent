# pyright: basic, reportTypedDictNotRequiredAccess=false
"""The member's stream log and live head (ARCHITECTURE §19.5), on the same table shape the real one will have."""

import json
from dataclasses import dataclass
from typing import Any

from local import config
from local.aws import Stack


@dataclass(frozen=True)
class StreamEvent:
    seq: int
    kind: str
    data: dict[str, Any]


@dataclass(frozen=True)
class LiveHead:
    """The turn being written: what a door has not yet received as a finished message."""

    turn_id: str
    text: str


class StreamLog:
    def __init__(self, stack: Stack) -> None:
        self._db = stack.dynamodb

    def append(self, member: str, kind: str, data: dict[str, Any]) -> int:
        """Takes the member's next sequence number atomically, so events stay in order and are never repeated."""
        head = self._db.update_item(
            TableName=config.TABLE,
            Key={"pk": {"S": f"STREAM#{member}"}, "sk": {"S": "HEAD"}},
            UpdateExpression="ADD seq :one",
            ExpressionAttributeValues={":one": {"N": "1"}},
            ReturnValues="UPDATED_NEW",
        )
        seq = int(head["Attributes"]["seq"]["N"])
        self._db.put_item(
            TableName=config.TABLE,
            Item={
                "pk": {"S": f"STREAM#{member}"},
                "sk": {"S": f"EVT#{seq:012d}"},
                "kind": {"S": kind},
                "data": {"S": json.dumps(data, ensure_ascii=False)},
            },
        )
        return seq

    def head(self, member: str) -> int:
        item = self._db.get_item(
            TableName=config.TABLE, Key={"pk": {"S": f"STREAM#{member}"}, "sk": {"S": "HEAD"}}, ConsistentRead=True
        ).get("Item")
        return int(item["seq"]["N"]) if item else 0

    def after(self, member: str, seq: int) -> list[StreamEvent]:
        items = self._db.query(
            TableName=config.TABLE,
            ConsistentRead=True,
            KeyConditionExpression="pk = :pk AND sk BETWEEN :first AND :last",
            ExpressionAttributeValues={
                ":pk": {"S": f"STREAM#{member}"},
                ":first": {"S": f"EVT#{seq + 1:012d}"},
                ":last": {"S": "EVT#~"},
            },
        ).get("Items", [])
        return [
            StreamEvent(
                seq=int(i["sk"]["S"].removeprefix("EVT#")), kind=i["kind"]["S"], data=json.loads(i["data"]["S"])
            )
            for i in items
        ]

    def write_live(self, member: str, turn_id: str, text: str) -> None:
        self._db.put_item(
            TableName=config.TABLE,
            Item={
                "pk": {"S": f"LIVE#{member}"},
                "sk": {"S": "HEAD"},
                "turn_id": {"S": turn_id},
                "text": {"S": text},
            },
        )

    def clear_live(self, member: str) -> None:
        self._db.delete_item(TableName=config.TABLE, Key={"pk": {"S": f"LIVE#{member}"}, "sk": {"S": "HEAD"}})

    def live(self, member: str) -> LiveHead | None:
        item = self._db.get_item(
            TableName=config.TABLE, Key={"pk": {"S": f"LIVE#{member}"}, "sk": {"S": "HEAD"}}, ConsistentRead=True
        ).get("Item")
        return LiveHead(turn_id=item["turn_id"]["S"], text=item["text"]["S"]) if item else None
