# Design artifacts

The three design pages made during the design phase, kept here as source so
they live with the code. The live, animated versions are Claude artifacts
(private to the account; share from each page's menu):

| File | Live page | What it is |
| --- | --- | --- |
| `architecture.html` | <https://claude.ai/artifact/DHWD7WFjsy7r3VmMvu9eDx> | The animated architecture (v3): four scenarios that send a packet hop by hop through Telegram, the webhook, the agent, Claude on Bedrock, the engine and the registry; the agent's tool loop replayed on a worked example; the news-to-stance pipeline; the holdings registry and kind profiles; the engine's pillars, stance cascade and confidence formula; the cards; the weekly schedule; cost against the £50 cap; the repository layout and phases. Opens as a normal web page. |
| `journeys.html` | <https://claude.ai/artifact/LQAFk1kz4sddEMkKnwpbam> | Eight user journeys played on a phone frame: first open, adding a holding by factsheet and screenshot, the morning brief, asking why, a stance with confidence, a red alert, the Saturday review with the dashboard, and settings by chat. With narration and a "behind the scenes" strip. Opens as a normal web page. |
| `dashboard/` | <https://claude.ai/artifact/A9mF3PJ91NJ9gRshFes5qp> | The read-only Mini App dashboard as five phone-size artboards: Overview, a holding, Overlap, Scorecard, and Overview in the light theme. These are Design-canvas sources (`.dc.html` plus `canvas.json`); they render on the canvas, not as standalone pages, because they reference the canvas runtime (`./support.js`). Their markup and inline styles are the spec for `miniapp/` in phase 5. |
| `lucid/` | <https://lucid.app/lucidchart/c35c6ddd-69ca-4423-aeb1-2491b75a4678/edit> | The component diagram in Lucidchart: the household and Telegram zone, every AWS service with the one agent (model routing, the 16 tools), the DynamoDB table with its four entity groups, the scheduled pipeline, and the services outside AWS (Anthropic API, data feeds, CI). `architecture.png` is the rendered page; `architecture.lucid.json` is the Lucid Standard Import file it was created from, re-importable into Lucidchart. Embedded in `ARCHITECTURE.md`. |

All figures on these pages are illustrative. Nothing is built; see `PLAN.md`.

The pages use Google Fonts (Inter, JetBrains Mono) and nothing else from the
network. Both standalone pages follow the viewer's light or dark theme.
