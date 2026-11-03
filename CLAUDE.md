# MyPaisa: where the code lives

Arun, 3 Nov 2026 (MA-24): the code is structured in four top-level folders, one per part of the system.

| Folder | Holds | Its rules |
| --- | --- | --- |
| `backend/` | The Python package (FastAPI controllers, services, repositories, domain), its tests, `pyproject.toml` and `uv.lock` | [`backend/CLAUDE.md`](backend/CLAUDE.md) |
| `web/` | The web app: a SvelteKit 3 PWA with Tailwind, shadcn-svelte and TanStack Query, and the shared `#lib` (MA-194) | [`web/CLAUDE.md`](web/CLAUDE.md) |
| `ios/` | The iOS app: React Native shell with a native SwiftUI core (MA-165) | joins with MA-165 |
| `infra/` | Terraform for dev and prod (MA-26) | `.claude/rules/aws-changes.md` |

Everything else is the plan and its tooling: `docs/` (designs, Confluence, the trace), `scripts/` (plan-sync, the
gates), `review/` and `.claude/` (rules, skills, hooks). A file under the four code folders belongs to a story's
`code` paths in `docs/trace.json` (`python3 scripts/plan_sync.py pr-files`).

The plan, the designs, Jira and Confluence have their own rules in `.claude/rules/`.
