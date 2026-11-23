from pathlib import Path

from mypaisa_agent.api.openapi import schema

COMMITTED = Path(__file__).resolve().parents[2] / "openapi.json"


def test_the_committed_schema_is_what_the_app_serves() -> None:
    assert COMMITTED.read_text(encoding="utf-8") == schema(), (
        "backend/openapi.json is stale: run `uv run python -m mypaisa_agent.api.openapi > openapi.json`, "
        "then `pnpm --dir web api:types`"
    )


def test_the_schema_is_openapi_3_1() -> None:
    assert '"openapi": "3.1' in schema()
