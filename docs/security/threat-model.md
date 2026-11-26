# MyPaisa threat model

Drafted 26 Nov 2026 (MA-363) from the repository at e17bb30, by `crew:security`, read only. Corrected the same day
against the scanner work MA-363 added (`scripts/security_scan.sh`, its `ios` mode and `swift-proof`). Method: STRIDE
on each trust boundary.

**What exists today.** A FastAPI app with two public health routes; a SvelteKit PWA on stubbed data with a stubbed
sign-in; an iOS shell with one SwiftUI piece and no sign-in; Terraform for one table, four buckets, the SSM
parameters, the watch tower and the CI roles; five workflows. Everything else in this file is the design in
ARCHITECTURE.md, and is marked **planned**. A control is **built** only where a file is named.

**Severity.** P0: household data exposed or changed now. P1: one step from that, or a bypass in built code.
P2: needs a foothold, or a design gap to close before the named story ships. P3: hardening.

How the standards map onto this file is `docs/security/standards-map.md`; what the scanners miss is
`docs/security/scanner-gaps.md`; who checks what, and when, is `docs/security/README.md` and
`.claude/rules/security.md`.

## Assets

| # | Asset | Where |
| --- | --- | --- |
| A1 | The household's records, events and views | `mypaisa-prod-core` (DynamoDB) |
| A2 | Every file a member sends, kept for good; workbooks waiting to import; the nightly Parquet copy | `mypaisa-prod-documents`, `-imports`, `-exports` (S3) |
| A3 | Identities and sessions: Cognito users, refresh tokens, the web session cookie, passkey credentials, invite tokens, the session epoch | Cognito, DynamoDB, the Keychain, the browser (planned) |
| A4 | Secrets: the Claude keys, Twelve Data, the APNs key, the Sign in with Apple key, the Web Push key; and the sign-in ids that act as audiences | SSM `/mypaisa-agent/<env>/` |
| A5 | The audit log and the RunRecords (their integrity) | DynamoDB (planned) |
| A6 | The agent's authority: its tools, Confirm, memory notes, settings | the agent loop (planned) |
| A7 | Money: the Claude ceiling, the AWS budget | Anthropic Console, AWS Budgets |
| A8 | The delivery chain: `main`, the CI roles, Terraform state, the ECR images, the GitHub `prod` environment | GitHub, `wealth-tracker-tfstate`, ECR |
| A9 | Keys on the laptop: the developer role's session, the identity under it, the `gh` token, the App Store Connect key, the signing certificate, the dev Claude key in a process | the laptop |
| A10 | The domain: the `mypaisapp.com` zone, the wildcard certificate, the dashboard origin (the web code's origin and the passkeys' relying party), the association file | Route 53, ACM, CloudFront (planned) |
| A11 | The app staying up, and a TestFlight build that has not expired | all of it |

## Actors

| Actor | Can | Wants |
| --- | --- | --- |
| Owner | everything an admin can; approves prod; security actions | |
| Admin, member, viewer, invitee | per ARCHITECTURE §4.5 | a member or viewer may try to read or write past the role |
| Outsider | reach the public hosts with no account | data, spend, takeover |
| Holder of a lost or stolen device | open the app or a signed-in browser | data, a lasting way in |
| Untrusted text | a file, a statement line, a workbook cell, a fetched page, a merchant name | steer the agent, leak data |
| A sibling host on `mypaisapp.com` | the old tracker at the apex; `dashboard-dev`, `api-dev` | ride or plant a prod cookie |
| A poisoned dependency | npm, PyPI, SwiftPM, a GitHub Action, a base image, a scanner's rules | run in CI or in the app |
| A process or agent tool on the laptop | a plugin, an MCP server, a hook, a prompt-injected session | the keys in A9 |
| Dev principals | the developer role, `ci-dev-deploy`, dev's stack roles | should never reach prod |
| A CI job | any job that holds `id-token` | a role |
| Providers | Apple, Google, Anthropic, AWS, GitHub | trusted; an outage or a breach there is out of our hands |
| The other app in the account | the wealth tracker's roles and resources | outside MyPaisa's guard |

## Findings

Twelve findings from the first pass, filed as one Jira task, **MA-366**. Each is
detailed in the rows below, where its id is named. Status as of this file's date.

| Id | Sev | One line | Blocks |
| --- | --- | --- | --- |
| F1 | P1 if true, not verified | The identity behind the developer role may keep standing admin rights (an IAM user with keys on the laptop) | The first release with household data in prod |
| F2 | P2 | `ci-dev-deploy` can be assumed by any job on `main`, not only the release's dev job | Nothing today; fix at the next bootstrap apply |
| F3 | P2 | "Claude never reads a secret, never puts a prod value, never approves prod" rests on words in the lead's session; `.claude/settings.json` denies only `git push` forms | Nothing; do it with MA-363's rule |
| F4 | P2, design | The developer role's one prod exception also covers the ids that decide who may sign in | MA-109 and MA-143 reaching prod |
| F5 | P2, partly addressed | The replacement for CodeQL Swift scanned almost nothing. MA-363 added Swift SAST on the laptop (`p/swift`, `p/mobsfscan`), `swift-proof` and the `ios` mode. Still open: `p/swift` gives only 2 rules without a Semgrep login, no rules of our own, `ios/src` (TypeScript) is not scanned | MA-363's own merge, now met for the records; the login question stays |
| F6 | P2, partly conditional | The prod guard does not cover what is shared or what already exists in the account (PassRole, AssumeRole, re-trust, Route 53, no resource-side deny) | The first release with household data in prod |
| F7 | P2, design | The web session cookie shares its site with hosts MyPaisa does not control equally (no `__Host-` prefix, no `Origin` check, `/docs` in dev loads a third party's script) | MA-109 and MA-73 reaching prod |
| F8 | P2, owner decision | Linking a new sign-in needs no second check (MA-77), against ASVS L2 | Nothing until Arun answers |
| F9 | P3 | An image with a known critical CVE is pushed and deployed unchecked (`trivy image` is planned, MA-267) | MA-347, the first Lambda on the image |
| F10 | P3 | The SAST gate can lose rules and still pass: the rulesets are fetched at run time and nothing counts them; semgrep and zizmor are pinned by version, not by hash | Nothing |
| F11 | P3, partly addressed | Nothing kept a key file out of a public commit. MA-363 added `*.p8`, `*.p12`, `*.pem`, `*.mobileprovision` and `AuthKey_*.p8` to `.gitignore` and `ios/.gitignore`. Still open: where the App Store Connect key lives (MA-167), and a tree check in the `ios` mode | MA-167 |
| F12 | P3, partly addressed | The built app's hardening is done but not proved. The `ios` mode now asserts the Release app's ATS keys. Still open: `mpBench` is read in every build and is in no gate's list; `style-src 'unsafe-inline'` against ARCHITECTURE.md:1995-1997 | Nothing |

### Open questions for Arun

1. **Linking a sign-in (F8, MA-77).** ARCHITECTURE.md:473-479 lets a signed-in member link a new Apple or Google
   account or a passkey with no second check. ASVS L2 asks for re-authentication before a change to how an account
   signs in. Keep the decision and record it as an accepted risk, or put linking behind the second check?
2. **Semgrep login (F5).** Semgrep's Swift rules are mostly behind a login: `p/swift` gives 2 rules without one,
   65 withheld. Sign the laptop in to Semgrep (free tier; it sends scan metadata to Semgrep), or stay logged out
   with `p/mobsfscan` and rules of our own?
3. **Read-only AWS calls (F1, F6).** May the lead make four kinds of read-only call to the account: `aws iam
   list-users`, `aws iam list-access-keys` and `aws iam list-attached-user-policies` for each user (F1), and `aws iam
   list-roles` with each role's trust and policies when it has no `mypaisa-dev-boundary` (F6)? Add `aws sso-admin
   list-permission-sets` if Identity Center is used. They change nothing.
4. **Money (F4, CIS).** Three fixes cost money or change an owner decision, so each needs his word and its price
   first (`.claude/rules/aws-changes.md`): a customer KMS key, a CloudTrail trail with its bucket, and GuardDuty.

## Boundary 1: the browser and the web app

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | The stub session and the dev switches (`?as=`, `?stub=`) count as signed in | `web/src/lib/auth/session.ts:37-104`, `guard.ts:10-21`, `routes/+layout.ts:12-17` | Built as a stub on purpose; no data behind it. Planned: the api's cookie and authorizer (§13) | No check fails if the stub or a switch survives the real sign-in; the web gate looks only for `auth/local` (`scripts/web_gates.sh:52`) | P2 |
| S, T | A sibling host rides or plants the session cookie | ARCHITECTURE.md:2700-2706 | Planned: `HttpOnly`, `Secure`, `SameSite=Strict`, CORS for the dashboard only | No `__Host-` prefix and no `Origin` check in the design (F7) | P2 |
| T | Script injected through a reply, a card or a member's text | `web/src/lib/components/chat/` | Built: no `{@html}` in `web/src` (searched 26 Nov 2026); CSP with SvelteKit's hashes (`web/vite.config.ts:15-31`), asserted by `scripts/web_gates.sh:34-38`; `no-eval` rules (`web/eslint.config.js:41-43`) | semgrep cannot read `.svelte`; no planted `{@html}` proves the lint bites; `style-src` allows `unsafe-inline` (`vite.config.ts:21`; F12) | P3 |
| T | The page framed by another site | | Planned: security headers on CloudFront (§8.4). The CSP is a meta tag, which cannot carry `frame-ancestors` | No CloudFront in `infra/` yet; the header scan is planned (`docs/RESEARCH.md` §7.2, gate 7) | P2 |
| R | A change made in the browser with no trace | | Planned: an audit row in the same transaction (§4.6) | Not built | P2 |
| I | Figures left on a shared laptop | `web/src/lib/sw/shell.ts:15-28` | Built: the service worker never stores `/v1` or `/.well-known` (`shell.test.ts`) | The offline outbox keeps unsent text in browser storage; what sign-out clears is not stated | P3 |
| I | The invite token in the address | `web/src/routes/join/[token]/` | Planned: single use, 24 hours, bound to household and role (§4.5) | `Referrer-Policy: no-referrer` and keeping the path out of logs are not stated | P3 |
| D | Many open streams | | Planned: one leader tab, closed 60 s after hidden, reserved concurrency of about 20 (§19.5) | Not built | P3 |
| E | A role enforced only in the page | | Planned: the authorizer and the write service decide (§4.5, §4.10) | Not built | P2 |

## Boundary 2: the iOS app

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | The sign-in stub or a base URL override in a shipped build | `ios/MyPaisa/AppConfig.swift:10-14`, `:28-32` | Built: `#if DEBUG`; `scripts/ios_gates.sh` greps the Release binary and bundle (`:49`, `:79-95`); `scripts/security_scan.sh ios` also refuses the local stack's address, dev's host, `MP_PROBES` and the stub's launch hook in the Release app, read from `scripts/security/ios-allow.json` | `mpBench` is read in every build (`SceneDelegate.swift:41-44`) and is in neither list (F12) | P3 |
| T | Traffic read or changed on the way | `ios/MyPaisa/Info.plist:33-39`; `project.pbxproj:405`; `ios/Config/Prod.xcconfig:6` | Built: ATS on, local networking removed outside Debug, an https base URL compiled in and checked (`ios_gates.sh:85`). The `ios` mode refuses a loosened ATS in every `Info.plist` and in the built Release app, and an exception domain the allow-list does not name (MA-363, laptop only). No pinning, by decision (§13) | The Dev app's built plist is not read (only the Release app) | P3 |
| T | A link opens the app and acts | `SceneDelegate.swift:51-57` passes every URL to React Native | No URL scheme, no associated-domains entitlement, an empty association file (`web/static/.well-known/apple-app-site-association`). The allow-list already names the only associated domains allowed | When `/join/<token>` lands: one place checks host and path, and no link acts without a tap | P2 |
| I | Tokens or the offline copy read from the device or a backup | | Planned: Keychain, this device only, after first unlock; complete file protection; the switcher snapshot hidden (§13) | No code and no entitlements file yet. On the laptop semgrep's Swift rules now read the Swift (`p/swift` gives 2 rules logged out; `p/mobsfscan` adds Keychain accessibility, logging, weak hash and the like) and `ios-allow.json` limits `keychain-access-groups` to the app's own ids. No rule of our own yet (F5) | P2 |
| I | A figure or token in a log, a screenshot or a notification | `SceneDelegate.swift:43` logs timings only | Planned: no amount in a notification unless asked (§13). `p/mobsfscan` has logging rules for Swift | Not built | P3 |
| I | The privacy manifest says nothing is collected | `ios/MyPaisa/PrivacyInfo.xcprivacy:32-35` | True today | Must change with the first real data; no scan reads it | P3 |
| D | A TestFlight build expires | | Planned: a day-60 alert, a day-75 banner, a minimum-version route (§17.4) | Not built | P3 |
| E | Face ID on the phone taken as server proof | | Planned: the second check is a server-verified assertion bound to the action (§4.5) | Not built | P2 |
| T | A poisoned native dependency | `ios/Packages/MyPaisaUI/Package.resolved`; `web/pnpm-lock.yaml` | Built: osv-scanner reads both (`scripts/security_scan.sh`, `scan_deps`); pnpm waits a day for a new version and runs no install script but esbuild's (`web/pnpm-workspace.yaml:48-50`) | React Native's prebuilt frameworks are fetched at `spm update`; their integrity was not examined | P3 |

## Boundary 3: API Gateway and the Lambdas

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | A route ships with no authentication | `backend/src/mypaisa_agent/api/routers/` | Built: only `/v1/health` and `/v1/health/ready`, public by design (`health.py:9-24`). Planned: the authorizer on every call, and a smoke that expects 401 on every OpenAPI route (§17.4) | No test yet fails a new router that lacks the auth dependency | P2 |
| T | A request changes fields it should not | | Planned: `PATCH /v1/records/{id}` takes only editable fields, from an admin, through the write service (§13). Built: strict Pydantic models and typed problems (`api/problems.py`) | Not built | P2 |
| R | A write with no audit row; a run with no record | | Planned: one transaction, a hash chain, a RunRecord per run (§4.6, §9.1) | Not built | P2 |
| I | An error or a log line carries content | `api/problems.py:46-60`; `api/app.py:21-28` | Built: a 500 says nothing; validation errors carry location and type only; prod serves no `/docs`. Planned: the leak test (§9.9) | `/v1/health` tells anyone the version and environment; `/docs` in dev loads a third party's script (F7) | P3 |
| D | Floods on the open routes (`/auth/nonce`), or on Claude | | Planned: the ceiling and its guards (§14.1), reserved concurrency on the stream | No throttle or WAF is defined in `infra/` | P2 |
| E | One member reads another household, or another member's detail | | Planned: every item keyed by household, the registry refuses, tests say so (§4.5) | Not built. This is the row to test hardest: object by object, not route by route | P1 when built |
| E | A function's role reaches more than its job | `infra/modules/mypaisa/probe.tf:16` | Built: dev's roles carry the boundary. Planned: a role per function naming its own resources (§17.1) | Prod's roles carry no boundary | P2 |

## Boundary 4: Apple, Google and Cognito

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | A forged, replayed or misdirected identity token | | Planned: issuer, audience, expiry, issue time under five minutes, the api's nonce, replay refused; mapped by `sub`, never by address (§13) | Not built. Also to state: an algorithm allowlist, keys only from the provider's published set, a conditional write on the nonce | P1 when built |
| S | The audience is swapped from the laptop | `infra/bootstrap/prod_guard.tf:56-73`; `infra/modules/secrets/main.tf:33-41` | The put is logged by CloudTrail | F4 | P2 |
| S | A live session links a new sign-in and keeps it | ARCHITECTURE.md:473-479 | Planned: an audit row and a new-device message | No second check, by decision (F8) | P2 |
| T | A passkey made for one host used on another | | Planned: the relying party is the dashboard's own host, fixed before anyone registers (§4.5) | Good: a sibling host cannot assert it | |
| R | A sign-in, link or unlink with no trace | | Planned: each is an audit row | Not built | P2 |
| I | A client secret or provider key read by CI | `infra/bootstrap/roles.tf:110-113` | `ci-plan` holds `ReadOnlyAccess` less the denies | Keep the pool's clients without a secret and use no Cognito identity provider: `DescribeUserPoolClient` and `DescribeIdentityProvider` return them | P3 |
| D | The custom-auth triggers called without end | | | No limit stated for `/auth/*` | P2 |
| E | An invite used twice or for a higher role | | Planned: single use, bound to the role | The redemption must be one conditional write | P2 |

## Boundary 5: DynamoDB

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| T | A dev principal writes prod's table | `infra/bootstrap/prod_guard.tf:19`, `:141-146` | Built: denied by name and by tag; proved by `scripts/infra_guard_check.py:80` | Roles that already exist, and no resource policy on the table (F6) | P2 |
| T | A write crosses households | | Planned: enforced in code, since one table cannot be split by IAM (§4.5) | Not built | P1 when built |
| R | An audit row edited or removed | | Planned: a hash chain and a weekly check (§4.6) | Not built | P2 |
| I | Read at rest or from a backup | `infra/modules/mypaisa/main.tf:16`, `:28-32` | Built: deletion protection and point-in-time recovery in prod; the AWS-owned key | No customer key, by cost | P3 |
| I | CI reads items | `infra/bootstrap/roles.tf:190-214` | Built: denied; proved by the guard check | | |
| D | On-demand cost runs away | `infra/bootstrap/budget.tf` | Built: alerts at 80% and 100% | Alerts only | P3 |

## Boundary 6: S3 (documents, imports, exports, the site)

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | A link to a file passed on | | Planned: five-minute links after a role check, each opening an audit row (§4.6) | Not built | P2 |
| T | A file overwritten or deleted | `infra/modules/mypaisa/s3.tf:22-24`, `:57-65` | Built: `prevent_destroy`; versioning in prod | No Object Lock; the app's role must never hold `DeleteObject*` | P2 |
| T | A hostile file: HTML, SVG, a macro workbook, a zip bomb, a PDF | | Planned: read by a quarantined extractor with no tools (§21.2) | Not stated: a type allowlist checked on content, a size cap on the upload itself (a presigned PUT does not cap size), `attachment` disposition and a fixed type on the open link, the link staying on S3's host | P2 |
| T | A file name becomes a path | | Planned: `<household>/<member>/<yyyy>/<mm>/` (§4.6) | Say that the key is made by the server and the name is only metadata | P3 |
| R | A file read with no trace | | Planned: each opening is an audit row | No S3 access log or data events | P3 |
| I | A bucket or an object made public | `s3.tf:27-55`, `:67-94`; `infra/.trivyignore:3-7` | Built: owner enforced, all four public blocks, S3 encryption, TLS only; trivy's key finding accepted with its reason | No deny for principals other than prod's own (F6) | P2 |
| I | The Parquet copy outlives its use | | Planned: "encrypted, with a set retention" (§11.1) | No lifecycle rule yet | P3 |
| D | Storage grows for good | | By decision: every file is kept | No rule for old versions; the 20 MB cap is planned for workbooks only | P3 |
| E | The one-time upload link (§17.5) used by someone else | | Planned: one `.xlsx`, 20 MB, 15 minutes, nothing written until Confirm with the second check | Not built | P2 |

## Boundary 7: the Claude API and the agent's tools

All planned (ARCHITECTURE §21.2, §22.3, §11.1) but the last row. Nothing here can be tested until MA-271.

| | Threat | Planned control | Gap | Sev |
| --- | --- | --- | --- | --- |
| S | Text in a file or page speaks as the system or a tool | Third-party text only as labelled data in a tool result or a document block | | P1 when built |
| T | An injection makes a write | Drafts write nothing; Confirm commits the draft whose hash `PendingAction` holds; the policy gate; admin tools in code | | P1 when built |
| T | A poisoned note steers later runs | A run that read untrusted text writes no note; notes are read as data (§22.3) | | P2 |
| R | "Why did it say that" has no answer | The RunRecord with each tool call and the guards' decisions (§9.1) | | P2 |
| I | Data leaves through a search query or a fetched link | Server tools only in a call with no household figure; fetch only links already in the conversation; a tainted conversation loses outbound tools | A holding's name and ISIN still go to the search; accepted | P2 |
| I | Household figures at Anthropic | A key per environment in SSM | Anthropic's retention terms for the workspaces are not recorded in ARCHITECTURE | P2 |
| I | The system prompt is public | The repository is public | Rule to write down: no secret and no real figure in any prompt, recording or eval case | P3 |
| D | Spend without end | The ceiling's ladder, per member, day and run; the Console limit (§14.1) | | P2 |
| E | The model's SQL reads past the asker | DuckDB read only, external access off, configuration locked, 10 s and 10,000 rows, over the asker's views (§11.1) | | P1 when built |
| T | A poisoned SDK or model change | Built: `backend/uv.lock` with hashes, installed with `--require-hashes` (`Dockerfile:31-34`); pip-audit (`scripts/backend_gates.sh:23-27`) | The local agent uses a model alias (`scripts/local/agents.py:18`); prod must pin snapshots | P3 |

## Boundary 8: GitHub Actions, OIDC and Terraform

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | Another repository, a fork or a rename assumes a CI role | `infra/bootstrap/roles.tf:52-97`; `ecr.tf:81-100` | Built: GitHub's immutable subject with the owner's and the repository's ids, audience `sts.amazonaws.com` | | |
| S | Any job on `main` assumes `ci-dev-deploy` | `roles.tf:62-65` | | F2 | P2 |
| T | An action is replaced under us | every `uses:` in `.github/workflows/` | Built: pinned to commit SHAs; zizmor (`scripts/security_scan.sh`, `scan_workflows`); actionlint (`ci.yml:442-461`); CodeQL for the workflows (`codeql.yml`) | A weekly grouped update is merged on green checks | P3 |
| T | The plan applied is not the plan read | `release.yml:252-259` | Built: the digest must match | | |
| T | A value put by hand is overwritten by an apply | `release.yml:157-158`, `:272` | Built: `release.py secrets-safe` | | |
| T | An image is swapped or ships a known CVE | `ecr.tf:13`, `:16`; `ci.yml:418-440` | Built: immutable tags; the digest is carried | Nothing reads the scan (F9) | P3 |
| R | Who released what | | Built: the release run in GitHub; CloudTrail's 90-day event history | No trail, no alert on a prod parameter change | P3 |
| I | CI reads secrets, records or files | `roles.tf:144-215` | Built: explicit denies; proved by `infra_guard_check.py:112-146` | Object keys and parameter names stay listable; the alert address is in the two states it may read | P3 |
| I | A secret in state | `infra/modules/secrets/main.tf:49-60` | Built: `value_wo`; separate secrets roots | | |
| I | The plan comment leaks, or the commenting job holds AWS | `ci.yml:247-335` | Built: two jobs, one with `id-token`, one with `pull-requests: write` | | |
| D | A dev principal deletes the OIDC provider | `prod_guard.tf:187-199` | Creation is denied | Deletion is not | P3 |
| E | A dev principal reaches prod | `infra/bootstrap/prod_guard.tf` | Built: by tag, by name, by boundary; `tf.sh` refuses a local prod apply (`infra/scripts/tf.sh:45-48`) | F6 | P2 |
| E | Workflow text injection | `jira-key.yml:32-38`; `ci.yml:70-78`; `release.yml:58-64` | Built: untrusted fields pass through `env`; the `workflow_run` trigger is fenced to a push to `main` in this repository; zizmor reads every workflow | | |

## Boundary 9: the laptop and its keys

| | Threat | Where | Control today | Gap | Sev |
| --- | --- | --- | --- | --- | --- |
| S | The identity under the developer role is itself an admin | `infra/README.md`, "The first time" | | F1, not verified | P1 if true |
| S | The developer session is lifted from the laptop | `infra/bootstrap/roles.tf:9-30` | Built: MFA to assume | A session lasts 12 hours and any local process can use it | P2 |
| T | An agent session reads a secret, puts a prod value or approves prod | `.claude/settings.json:41-51` | The crew guard, inside crew agents; the rule `.claude/rules/security.md` (MA-363) says agents never read a secret's value | F3: no deny or hook in the lead's session | P2 |
| E | The owner's `gh` token approves prod | `infra/bootstrap/github.tf:9-16` | Arun is the one reviewer | The token can approve through the API; hardware-key 2FA on GitHub does not cover a token already on disk | P2 |
| I | The App Store Connect key file is copied or committed | `README.md:270`; `PLAN.md:112` | Kept out of GitHub by rule; since MA-363 `*.p8`, `*.p12`, `*.pem`, `*.mobileprovision` and `AuthKey_*.p8` are in both ignore files; gitleaks reads history and staged files | F11: where it lives is MA-167's; no tree check yet | P3 |
| I | The dev Claude key in a local process | `scripts/local/run.py:22-34` | By design; never printed | | P3 |
| I | The local stack reached from another machine or page | `scripts/local/app.py:132-139`; `config.py:21-37` | Built: loopback only, by peer and by Host; synthetic data | The stub's tokens are guessable by design | P3 |
| E | A plugin, MCP server or hook runs with the owner's rights | | | No inventory, no pinning. The agent supply chain (ASI04) is widest here | P2 |
| R | An act on AWS with no name | `roles.tf:12` | `sts:SetSourceIdentity` is allowed | Not required | P3 |

## Accepted, by the owner's decision

- One AWS account for dev and prod, kept apart by IAM (§17.1).
- S3's own encryption and DynamoDB's AWS-owned key, no customer key (`infra/.trivyignore:3-7`, `main.tf:32`).
- The alerts topic is not encrypted (`infra/.trivyignore:9-14`).
- No certificate pinning in the app (§13).
- The developer role may put prod's parameters (Arun, 24 Nov 2026, MA-26). F4 asks to narrow it.
- Linking a sign-in needs no second check (Arun, 29 Oct 2026, MA-77). F8 asks him again.
- No VPC until after phase 15 (MA-283).
- No Swift analysis on GitHub; it runs on the laptop (Arun, 26 Nov 2026, MA-166).

## Keeping this file current

Update it in the same pull request when a change:

- adds an asset (a new bucket, table, queue, secret or kind of personal data);
- adds an entry point (a route, a link type, a push action, a tool, a schedule, a webhook);
- adds or moves a trust boundary (a new provider, a new role, a new host, a new place a key lives);
- turns a "planned" row into code: name the file, and the test or gate that proves it;
- changes an accepted risk.

A row is "built" only with a file and, where one exists, the check that fails without it. The stories that will
change the most rows: MA-109, MA-143, MA-76, MA-102 (boundary 4), MA-30, MA-266, MA-27 (3 and 5), MA-148, MA-149
(6), MA-271, MA-247, MA-253 (7), MA-107, MA-347, MA-108 (8), MA-167 (9), MA-73 (1), MA-165 and its sign-in (2).

A phase exit refreshes the whole file (`crew:security`, `/sec-check --phase`), and the first prod release adds a
deep audit (`claude-security:attack-surface-analysis`). See `docs/security/README.md`.
