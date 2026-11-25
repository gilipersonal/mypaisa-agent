# The local stack (MA-198)

The whole app on the laptop, with no AWS and no Claude spend (ARCHITECTURE §17). Nothing here ships: it sits outside
`backend/src`, so no deployed image can hold the sign-in stub or the stand-ins for the chat api and the stream.

```bash
uv run --directory backend python ../scripts/local/run.py
```

```bash
corepack pnpm@12.16.1 --dir web dev
```

The first starts moto on 8788 and the app on 8787, both on loopback only. The second serves the web app, which proxies
`/v1` to it; `http://localhost:5173/?local` runs the scripted journey in a card under Home that only development builds
have (MA-208: Home itself now shows the stubbed dashboard).

For the iOS app, start Metro and build the MyPaisa Dev scheme's Debug configuration, then launch it with the local
address and a member to sign in as:

```bash
corepack pnpm@12.16.1 --dir web --filter @mypaisa/ios start
```

```bash
SIMCTL_CHILD_MYPAISA_API_URL=http://127.0.0.1:8787 SIMCTL_CHILD_MYPAISA_AUTH_STUB=owner_arun xcrun simctl launch booted com.mypaisapp.agent.dev
```

The hero shows the reply. Members are `owner_arun`, `member_asha` and `viewer_guest`.

## What runs

| Piece | Here | Real one |
| --- | --- | --- |
| DynamoDB, S3, SQS | moto, `mypaisa-local-*` names | Terraform, MA-26 |
| Sign-in | `POST /v1/auth/local`, this machine only | Cognito, MA-102 |
| Chat api | `POST /v1/chat/messages`: `202`, then `updates.fifo` | MA-31 |
| The stream | `GET /v1/stream`, §19.5's wire | MA-30, after the spike MA-195 |
| The agent | `ScriptedAgent` replays `recordings/` | `AnthropicAgentRunner`, MA-271 |

The stand-ins speak the wire ARCHITECTURE fixes, so a door written against them meets the real handlers unchanged, and
those stories replace them. The recordings stay: they become the evals' T0 layer (MA-246).

## Modes

`--agent scripted` is the default and needs no key. `--agent claude` reads dev's key from SSM and calls Claude Opus 5.5,
which **costs money** and needs MA-21's key: it has run only against a fake client so far. It has no tools and
no access to records, so it cannot state a figure.

## A recording

`recordings/<name>.json`: an `id`, then `turns`, each the member's words (`user`) and the agent's reply (`agent.deltas`,
the text as it was written, and `agent.cards`). Matching ignores case and spacing. A message with no recording gets a line
saying so. Two recordings of one message, or an empty folder, stop the stack from starting.
