# MyPaisa · the demo (MA-290)

A clickable demo of the whole wealth app and the Admin center, at four doors, on the illustrative household's
figures. **Not product code**: no backend, no model calls, nothing leaves the machine. It draws the current boards
(Claude Design, mirrored in `docs/design/`) as they are drawn and picks none of them.

```sh
npm install
npm run dev     # http://127.0.0.1:5290/
npm run build   # dist/: a static folder that runs offline from any static server
npm run gate    # types, board styles, colours, tests, build, the walk in Chromium and WebKit
```

## Using it

- **Top bar:** Door (Desktop 1440, Phone web 390, iPhone, iPad), Width (web and iPad: drag through the width rule's
  edges), Theme, Privacy, Viewer (Arun the owner, Asha a member), Money (£ or ₹), Walk, Restart.
- **Free roam:** sign in, then go anywhere. The chips above the composer offer what can happen next on the household's
  clock; typing a few words ("monzo savings", "statement", "school fees") starts the same flows.
- **Walk:** the household's story in 22 steps, Mon 26 Oct to the Admin day and the iPad; each step has a guide line
  and a line to say. Tap a step to jump there (it is rebuilt from the start, so it equals walking there), or Continue.
- **Deep links:** `#door=iphone&theme=dark&viewer=asha&priv=1&clock=d3&page=debt&id=hdfc&walk=1`.

## How it is built

- `src/state/`: one state, one reducer, the one write path (every change is an audit event from the demo ledger),
  the chat engine, the width rule (`layout.ts`), totals computed from the records (`totals.ts`).
- `src/ui/`: the shells and renderers, on Prototype v4's own markup; `src/styles/boards/` holds its styles, copied
  byte for byte (`npm run boards`; `npm run check` fails if a board changed since).
- `src/areas/<area>/`: each area's pages, chat flows and appliers (`AREAS.md` is the contract).
- `src/presenter/`: the walk.
- Data: `docs/design/figures/household-v4.json`, `future-plans-v4.json` and `demo-ledger-v4.json`
  (`make_demo_ledger.py`), never copied.

`PLAN.md` is the plan, `DISAGREEMENTS.md` the board disagreements and what the demo follows, `HANDOFF.md` where the
work stands.
