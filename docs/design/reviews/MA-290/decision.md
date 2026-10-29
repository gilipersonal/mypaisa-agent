# MA-290: a clickable demo of the whole app, on stubbed data

## The request, in Arun's words (29 Oct 2026)

"I need you to create working prototype for demo with stubbed UI data for the
entire application end to end based on the UX design pieces we created."

## The pick (29 Oct 2026)

Arun answered four questions the same day:

| Question | Arun's answer |
| --- | --- |
| What it is built as | **A standalone demo app** in its own folder, `prototype/`, not product code in `web/`. It is built on the DS `tokens.css`, `ios.css` and `motion.css` and the boards' own markup, reads the figure set as its stub data, runs locally and builds to a static folder that opens offline. |
| How much of the app | **Whole wealth plus admin**: phases 0 to 9's current boards (sign-in, the shell and chat, Home, Register, Check-ins, Assets and debts, Budget and statements, Budget forecast, Projection and what-ifs, Plans, Activity and a run, Audit and Files, the Admin center, You). Not the market side. |
| Which doors | **Desktop web 1440, phone web 390, iPhone and iPad**, with a door switch as in Prototype v4. |
| How the chat behaves | **Both modes**: free roam where every screen is reachable and the chat runs scripted flows (chips, one card per question, Confirm, Edit, Cancel; Confirm moves the figures, writes the audit row and a run), plus a presenter mode that walks the household story step by step. |

He then asked for it to be built in batch mode (foundations first, then four
areas in parallel, then the merge) with Claude Opus 5.5 building the
foundations and the merge and Claude Sonnet 5.5 the four areas, under a cap of
$180 of Claude spend, and for the work to be handed off cleanly to the Claude
Code app if the cap is reached (`prototype/HANDOFF.md`).

## What this pick does and does not decide

- It decides the demo's form, scope, doors and modes. It is MA-290's own pick.
- It **does not pick any board for its own story.** The demo draws the current
  boards as they are drawn, `planned` ones included; each story still goes
  through `/design-first` before its product code is written (plan-sync rule 3).
- Where boards disagree with each other or with ARCHITECTURE, the demo follows
  ARCHITECTURE and names the disagreement in `prototype/DISAGREEMENTS.md` and in
  the trace row's notes.
- Areas with no web board (Register, You) show the iPhone cards in the web chat
  and the iPhone You screen at 390 until MA-279 draws them.
- MA-290's trace row cites only boards already picked by their own stories, so citing them changes no board's
  state; the planned boards it also draws are named in the row's notes and in `prototype/PLAN.md` (the screens
  table). The plan is `prototype/PLAN.md`; the disagreements found are in `prototype/DISAGREEMENTS.md`.
- Its estimate in `docs/roadmap.json` is 0: it was built in the session that recorded it, so it moves no date.

## Builds on

MA-193 (Prototype v4 and its picks: shell 1a, dashboard 1a, check-in 1b,
Projection 1a), MA-264 (future plans: 1a, 2a, 3a), MA-281 (not used: market
side). MA-279's consolidated redraw supersedes the demo's pages where it
redraws them.
