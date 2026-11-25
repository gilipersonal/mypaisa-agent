# The crew: dev work runs in lanes, by the right agent

Arun, 25 Nov 2026 (MA-361): "design me a team of subagents to do all the dev
work ... I am able to just prompt and you use your best judgement and pick the
agent, break it up into multiple lanes (upto max 10 if needed)". The team is the
`crew` plugin (`~/projects/crew-plugin`, enabled here at local scope): 18
agents, `crew:<name>`. This file is how it fits this repo. It changes no other
rule: when a review runs, what a PR needs and who merges stay as
`.claude/rules/ship-autopilot.md` and `.claude/rules/independent-review.md` say.

## What Arun decided

- **Route by judgement, not by asking.** For dev work beyond an answer or one
  small edit, the session is the lead and follows the `crew:route` skill: size
  the work, start only the agents it needs (one is a whole run), cut lanes of
  10 at most with one owner per file, join, run the gates itself, ask once.
  Small work stays with the lead.
- **Quality first.** Fable 5.2 for architecture, design, security and root
  cause; Opus 5.5 for building, tests, QA, audits and review; Sonnet 5.5 for
  bulk edits and the records; Haiku 5.5 for search only. Each agent's default
  model and effort is in its file in the plugin; the lead raises effort where a
  mistake is costly (migrations, IAM, auth, money maths, the release pipeline).
- **A checking agent asks first.** "Ask me first": any agent that checks another
  agent's work, the QA agent included, waits for his yes, in the same question
  as the merge. So `crew:qa` is offered beside the review in the merge question
  and never runs on its own; neither does `crew:reviewer`, nor a security or UX
  pass the lead would add after a build. Asking for one himself is the yes:
  "run QA on the Plans page" starts `crew:qa` at once, alone.

## How it runs here

- **The overlay is `.claude/crew.json`:** the areas with their paths, crew
  agent, rules file and gate; the gates, read from `.claude/jira-flow.json`;
  the flows (`/plan-sync` and `plan_sync.py start`, `/design-first`,
  `/jira-flow:track`, `/autoship`, the review brief); the shared files and who
  holds each; the limits every brief carries. `/crew:init --check` validates it.
- **Workers never commit, push, raise a PR, apply Terraform or read a secret.**
  The plugin's guard refuses those inside a crew agent; the lead does the first
  four under this repo's rules, and nobody does the last.
- **An independent review's lanes run as `crew:reviewer`,** one per lane (a, b,
  c, d, f), all in one message, each blind and briefed from
  `.claude/skills/autoship/review-brief.md`. Everything else about a review is
  `.claude/rules/independent-review.md`.
- **After QA, the merge question comes back** with QA's findings: fix them, or
  merge. QA's yes covers one QA pass, not the merge.
- **The lead holds back two gates at the join.** Plan-sync and the security scan run only on Arun's yes, asked once at the end of the work (`.claude/rules/ship-autopilot.md`, "Plan-sync and the security scan ask first"). The crew's other gates run at the join as usual, and no lane runs either of the two.
