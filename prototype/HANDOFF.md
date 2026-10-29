# MA-290 · handoff

Where the demo stands, so any session (this one, or the Claude Code app) can carry on. Updated at every milestone.

## Run it

```sh
cd ~/projects/mypaisa-agent-MA-290/prototype   # the worktree, branch MA-290-demo-prototype
npm install
npm run dev        # http://127.0.0.1:5290/  (Door, Theme, Privacy, Viewer, Money, Walk, Restart in the top bar)
npm run build      # prototype/dist, a static folder that runs offline
npm run gate       # types, board styles, colours, tests, build, the walk (Chromium and WebKit)
```

Deep links for any screen: `#door=web|phone|iphone|ipad&w=1180&theme=dark&viewer=asha&priv=1&clock=d1|d2|d3|d3e|d4&page=<id>&id=<param>&chat=1&walk=1`.

## Done

- **M0, records:** Jira MA-290 (In Progress), PLAN.md bullet in Phase 0, trace row, estimate 3 days in `docs/roadmap.json`, schedule and TRACE.md regenerated, Confluence pages regenerated (not yet published), decision record `docs/design/reviews/MA-290/decision.md`.
- **The demo ledger:** `docs/design/figures/make_demo_ledger.py` → `demo-ledger-v4.json`: 35 events, 42 runs, 2 files, the admin day, side branches, 12 board disagreements settled, asserts over its own data.
- **M1, foundation:** the four doors, the width rule (`src/state/layout.ts`), the page and chat renderers on Prototype v4's own markup and styles (copied byte for byte with a drift check), the store and the one write path (`src/state/reduce.ts`), the chat engine, Home, totals computed and held to the figure set's five snapshots (`tests/totals.test.ts`), the walk gate (`e2e/walk.mjs`), the colour gate, CI (`.github/workflows/prototype.yml`) and the `prototype` gate in `.claude/jira-flow.json`.

## In progress

- **M2 to M5, five parallel lanes** (each its own `src/areas/<area>/` and `tests/<area>.test.ts`; the contract is `AREAS.md`): `records` (register, check-ins, Activity), `money` (assets, debts, budget, statements, month close), `future` (Projection, plans, Budget forecast, what-ifs), `audit` (Audit, Files, file viewer, Reports), `household` (Admin center, You, sign-in variants).

## Next

1. Merge the lanes' work (all in this worktree), run `npm run gate`, fix the joins.
2. **M6:** the presenter script (`src/presenter/script.ts`) from the flows each lane reports; DISAGREEMENTS.md; README; the walk across every step.
3. Publish the Confluence pages (`/plan-sync --confluence`), run the plan-sync and design-sync gates, `/autoship` to raise the PR, then ask Arun about the review and the merge.

## Spend

Cap $180 (Arun, 29 Oct 2026). Stop starting new work at about $165 spent; commit, push, update this file and comment on MA-290.
