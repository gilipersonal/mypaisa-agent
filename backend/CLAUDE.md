# Working rules for the MyPaisa code (MA-24)

The plan, the designs, Jira and Confluence have their own rules in `.claude/rules/` (plan-sync, jira-flow,
ship-autopilot, independent-review, aws-changes). This file is how the code under `backend/src/` and
`backend/tests/` is written; the repo's layout is in the root `CLAUDE.md`.

## The three rules every line keeps

1. **Numbers come from code, never from a model.** Every figure a member sees is computed by the wealth maths
   (`wealth/`) or read from a record. Claude words and routes; it never does a sum, and every figure a reply
   states is checked against the tool results (ARCHITECTURE §1, §21, MA-248).
2. **Secrets live in SSM only.** Code reads them at run time through the SSM client; nothing prints, logs,
   returns or commits one, and no setting in `core/config.py` holds one (`.claude/rules/aws-changes.md`).
3. **Every write leaves an audit row, and every handler a RunRecord.** A write goes through the one write
   service with its `AuditEvent` in the same transaction (§4.10, MA-27, MA-28); every Lambda run records a
   RunRecord with its trace id (§9, MA-29).

## How the code is laid out

```
backend/src/mypaisa_agent/
  api/            controllers: FastAPI routers (routers/), request and response bodies (schemas/),
                  dependency wiring (deps.py), service errors as RFC 9457 problems (problems.py), the app factory
  services/       use cases: take repositories by constructor, return domain objects, raise core.errors
  repositories/   ports: Protocols the services read and write through; adapters implement them
                  (the DynamoDB single-table registry, MA-270; S3; SSM)
  domain/         entities and value objects as frozen Pydantic models; pure, no I/O
  core/           settings (pydantic-settings, MYPAISA_*) and the error classes every layer raises
```

- **Imports point one way:** `api -> services -> repositories -> domain`. Only `api` imports FastAPI or Starlette;
  `domain` imports no settings, no boto3 and no anthropic. `lint-imports` enforces all three.
- **Controllers stay thin:** parse, call one service, shape the response. No business rule in a router.
- **Services know nothing of HTTP:** they raise `NotFoundError`, `ConflictError`, `ForbiddenError` or
  `UnavailableError` (subclass them for a sharper `code`); `api/problems.py` maps each to its status.
- **The wire is not the domain:** a response body is an `api/schemas` model built from domain objects, so the API
  can change without the domain.
- **Dependencies come from the app:** `create_app(settings, probes)` builds a fresh app; `api/deps.py` reads
  everything from it. A test builds its own app or uses `app.dependency_overrides`; nothing is a module global.
- **Every route is versioned** under `/v1/`. Prod serves no `/docs` and no `/openapi.json`.
- **Money is `Decimal`,** never `float`, from the record to the reply (§4.8).
- **Async all the way:** handlers and services are `async`; boto3 calls run off the event loop.

## The gates

Run them all with `scripts/backend_gates.sh` from the repo root (`--offline` skips the dependency audit). The same script is the
jira-flow `backend` gate and CI's Backend job:

| Gate | Command |
| --- | --- |
| Lock | `uv lock --check` |
| Lint | `uv run ruff check .` (every ruff rule, a few named exceptions in `pyproject.toml`) |
| Format | `uv run ruff format --check .` (Black-compatible, so Black itself is not run) |
| Types | `uv run pyright` (strict, `backend/src/` and `backend/tests/`) |
| Layers | `uv run lint-imports` |
| Tests | `uv run pytest --cov --cov-fail-under=90` (branch coverage) |
| Audit | `uv run pip-audit --skip-editable` |

`uv run --directory backend pre-commit install` once per clone runs ruff, pyright, the layers and the lock check on every commit.

## Writing code here

- Python 3.14, `uv` only (`uv add`, `uv run`); no `pip install` into the project.
- Types on everything; `X | None`, never `Optional`. Absolute imports only.
- A test for every behaviour, named for what it proves (`test_not_ready_is_a_503_naming_the_failed_check`).
  Fakes for the ports live in `tests/fakes.py`; no test reaches AWS (moto for the adapters, MA-270).
- No TODO without its story: write `MA-<n>` and file the story if there is none (`.claude/rules/jira-flow.md`).
- Run locally, from `backend/`: `uv run uvicorn mypaisa_agent.api.app:create_app --factory --reload`.
