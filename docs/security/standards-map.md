# Standards map

Drafted 26 Nov 2026 (MA-363), corrected against the scanner work of the same story. For each standard: what checks it
today, by path, and what is missing. "Planned" means ARCHITECTURE describes it and no code exists. Requirement
numbers are given only where sure; confirm any number against the standard's own text before quoting it.

The standards the project holds itself to (`.claude/rules/security.md`): OWASP ASVS 5.0 at Level 2 for the web app
and the API; OWASP MASVS 2.x at the L1 profile for the iOS app; the OWASP Top 10 for LLM Applications 2025 and the
OWASP Top 10 for Agentic Applications 2026 for the agent; the CIS AWS Foundations Benchmark for the account, read
through trivy for the Terraform and, once built, a read-only `cis` check for the account itself.

## The checks that exist

| Id | Check | Path | Runs |
| --- | --- | --- | --- |
| C1 | gitleaks, whole history and staged | `scripts/security_scan.sh` (`secrets`, `staged`), `.gitleaks.toml`, `.pre-commit-config.yaml:7-12` | CI, weekly, pre-commit |
| C2 | semgrep: python, fastapi, typescript, javascript, secrets, github-actions over `backend web scripts .github`; on a Mac also `p/swift` and `p/mobsfscan`'s Swift rules over `ios/MyPaisa`, `ios/MyPaisaCore` and `ios/Packages` (MA-363) | `scripts/security_scan.sh sast` | CI and weekly (Linux, no Swift); the laptop (Swift) |
| C3 | osv-scanner over `uv.lock`, both npm locks and `Package.resolved` | `scripts/security_scan.sh deps`, `web/osv-scanner.toml` | CI, weekly |
| C4 | zizmor and actionlint over the workflows | `scripts/security_scan.sh workflows`, `.github/workflows/ci.yml:442-461` | CI |
| C5 | CodeQL: actions, javascript-typescript, python. No Swift (MA-166) | `.github/workflows/codeql.yml` | every PR, push, weekly |
| C6 | ruff with every rule (Bandit's `S` included), pyright strict, import layers, pytest at 90% | `scripts/backend_gates.sh`, `backend/pyproject.toml:50` | CI |
| C7 | pip-audit, strict, by hash | `scripts/backend_gates.sh:23-27` | CI, weekly |
| C8 | The built web app's CSP, fonts, stub absent; pnpm audit; eslint and svelte-check | `scripts/web_gates.sh:34-56`, `web/eslint.config.js` | CI |
| C9 | The Release app: bundle id, base URL, Debug hooks and stub absent | `scripts/ios_gates.sh:79-95` | laptop |
| C10 | trivy config (HIGH, CRITICAL), tflint, validate, `tf.sh` refusals | `scripts/infra_gates.sh` | CI |
| C11 | The prod guard and ci-plan's denies, by IAM's simulator | `scripts/infra_guard_check.py` | laptop, at a bootstrap apply |
| C12 | The release's refusals: plan digest, secrets-safe, values-ready | `scripts/release.py`, `.github/workflows/release.yml` | every release |
| C13 | Dependabot, weekly and grouped: uv, npm, docker, actions | `.github/dependabot.yml` | weekly |
| C14 | GitHub secret scanning with push protection | repository setting (ARCHITECTURE.md:3182) | always |
| C15 | `scripts/security_scan.sh ios`: every `Info.plist` and entitlements file against `scripts/security/ios-allow.json` (App Transport Security, exception domains, background modes, entitlement keys and values), and the built Release app's plist, binary and `main.jsbundle` for deny-listed strings, then gitleaks over the bundle and the binary's strings (MA-363) | `scripts/security_scan.sh`, `scripts/security/ios-allow.json`, proved offline by `scripts/security_scan_selftest.sh` (26 cases) | laptop only (MA-166) |
| C16 | `scripts/security_scan.sh swift-proof`: semgrep's Swift rules on a planted Swift file, each fault named, so a ruleset that stops biting is seen (MA-363) | `scripts/security_scan.sh` | laptop, on Arun's yes (it fetches semgrep) |
| C17 | `crew:sec-scan`, `crew:security`, `claude-security:scan`, `crew:sec-verify`, the verified sweep, all through `/sec-check` | `.claude/skills/sec-check/SKILL.md`, `.claude/rules/security.md`, `.claude/crew.json` flow `security` | laptop, on Arun's yes |

## OWASP ASVS 5.0, Level 2

Chapter titles are ASVS 5.0.0's own.

| Chapter | Where it applies | Covered today by | Gaps |
| --- | --- | --- | --- |
| V1 Encoding and Sanitization | Replies and cards at both doors; the model's SQL; file names | C2, C5, C6, C8 (`no-eval`, no `{@html}` in the source) | No scanner reads `.svelte` markup but eslint; no planted case. Output encoding of model text: planned (§13) |
| V2 Validation and Business Logic | Every request body; amounts parsed by code; Confirm; limits | Pydantic strict models (`backend/src/mypaisa_agent/api/schemas/`); C6 | Business limits and anti-automation: planned (§14.1, §21.2). No throttle in `infra/` |
| V3 Web Frontend Security | CSP, cookies, CORS, framing, third-party content | C8 asserts `script-src` hashes and no `unsafe-inline` there; fonts from self | `style-src 'unsafe-inline'`; framing and HSTS need CloudFront headers (planned); cookie prefix and `Origin` check missing from the design (F7); the header scan is planned |
| V4 API and Web Service | FastAPI, the SSE stream, OpenAPI | OpenAPI is generated and diffed (`backend/tests/api/test_openapi.py`); prod serves no docs (`api/app.py:21-28`); typed problems | Authentication on every route: planned. Method and content-type rules, SSE re-check every 60 s: planned |
| V5 File Handling | Uploads, the open link, the Excel importer | None | All planned (§4.6, §17.5). Missing from the design: type allowlist by content, size cap on the upload itself, `attachment` disposition, server-made keys |
| V6 Authentication | Apple, Google, passkeys, the second check | None | All planned (§4.5). No passwords, so the password rules do not apply. Linking a sign-in with no re-authentication (F8) does not meet L2 as designed |
| V7 Session Management | The cookie, tokens, the epoch, sign-out, the thirty-day browser session | None | All planned. Write down the idle and absolute limits and why; re-authentication before a change to how the account signs in |
| V8 Authorization | Roles, household and member scope, files by role | None | All planned (§4.5). Needs object-level tests: member A never reads household B, a member never reads another's detail, a viewer opens no file |
| V9 Self-contained Tokens | Apple's, Google's and Cognito's JWTs | None | Planned (§13). To state: algorithm allowlist, keys only from the issuer's set, audience per environment, the audience values not writable from the laptop (F4) |
| V10 OAuth and OIDC | Sign in with Apple and Google as an OIDC client | None | Planned: PKCE for Google on iOS, nonce, no client secret. To state: exact redirect and origin allowlists |
| V11 Cryptography | TLS, at-rest keys, the audit hash chain, WebAuthn | C10 (encryption at rest); AWS-managed keys | No hand-rolled crypto exists. The hash chain's algorithm and what anchors it: planned, unstated |
| V12 Secure Communication | CloudFront, API Gateway, ATS, S3 | S3 TLS only (`infra/modules/mypaisa/s3.tf:67-94`); ATS (`ios/MyPaisa/Info.plist:33-39`), now asserted in source and in the Release app by C15 | Minimum TLS on the custom domains and HSTS: planned |
| V13 Configuration | Secrets, settings, debug features, dependencies | C1, C3, C7, C12, C13, C14; `value_wo`; no secret in settings (`backend/src/mypaisa_agent/core/config.py`); key-file patterns in both `.gitignore` files (MA-363) | No guard on secret reads in the lead's session (F3); image scan not gated (F9) |
| V14 Data Protection | Records, files, caches, logs, the Parquet copy | The service worker caches the shell only (`web/src/lib/sw/shell.ts`); log retention 14 days (`observability.tf:38-50`) | Data classification is not written as one list; the leak test is planned (§9.9); export retention has no rule; a token in a URL (the invite) needs `no-referrer` |
| V15 Secure Coding and Architecture | Layers, dependencies, the documented decisions L2 asks for | C6 (import layers), C3, C7, C13; ARCHITECTURE §13 | The threat model (`docs/security/threat-model.md`) and this map are the documented decisions; the SBOM is the lockfiles, with no export |
| V16 Security Logging and Error Handling | Audit rows, RunRecords, CloudTrail, alarms | Generic 500 (`api/problems.py:59-60`); alarms and the topic (`observability.tf`) | Audit log and RunRecord: planned. No alert on a prod parameter change; no trail |
| V17 WebRTC | | | Not applicable: no WebRTC |

## OWASP MASVS 2.x, the L1 profile

The iOS app is a shell today, so nearly every control is planned. `NETWORK-2` and `AUTH-3` belong to L2,
`RESILIENCE` to the R profile and `PRIVACY` to the P profile; they are listed so the choice is on record.

| Control | Design | Covered today by | Gaps |
| --- | --- | --- | --- |
| STORAGE-1 stores sensitive data securely | Keychain, this device only; complete file protection (§13) | C2's Swift rules on the laptop (`p/swift` logged out has the UserDefaults rule only; `p/mobsfscan` adds Keychain accessibility and file protection); C15 limits `keychain-access-groups` to the app's own ids | No Swift code stores anything yet; no rule of our own for `ThisDeviceOnly` (F5) |
| STORAGE-2 prevents leakage | Snapshot hidden; no amount in notifications; no figure in logs | `p/mobsfscan` logging and pasteboard rules (C2) | No test; keyboard cache and pasteboard not mentioned in the design |
| CRYPTO-1, CRYPTO-2 | Platform crypto only; keys in the Keychain and Secure Enclave | `p/mobsfscan` weak-hash and insecure-random rules (C2), proved by C16 | No rule of our own for a hard-coded key |
| AUTH-1 secure protocols | Apple, Google with PKCE, passkeys; five-minute tokens, rotating refresh | Nothing | Planned |
| AUTH-2 local authentication | Face ID lock is comfort only; never authorises the server | Nothing | Planned |
| AUTH-3 step-up (L2) | The second check, bound to the action | Nothing | Planned |
| NETWORK-1 secure traffic | ATS, https only | C9 checks the base URL; the build removes local networking outside Debug (`project.pbxproj:405`); C15 refuses loosened ATS in the source and in the Release app | The Dev app's built plist is not read |
| NETWORK-2 pinning (L2) | None, by decision | | Accepted. `scripts/security_scan.sh` leaves out `p/mobsfscan`'s pinning rule |
| PLATFORM-1 IPC and links | Universal links on the dashboard's host | C15 allows only the dashboard's associated domains. No scheme, no entitlement, an empty association file | Link handling to be written and tested |
| PLATFORM-2 WebViews | None in the design; Google's sheet is the system's | `p/swift`'s WebView rule (C2) | A rule that fails on `WKWebView` appearing |
| PLATFORM-3 user interface | Privacy mode; snapshot hidden; notifications without figures | Nothing | Planned |
| CODE-1 platform version | iOS 26 (`ios/Config/Shared.xcconfig:4`) | Built | |
| CODE-2 enforced updates | `GET /v1/app/minimum-version`; day-75 banner | Nothing | Planned |
| CODE-3 no known-vulnerable components | | C3 (npm lock and `Package.resolved`), C13 for npm | Dependabot has no `swift` entry; React Native's prebuilt frameworks not examined |
| CODE-4 validates untrusted input | The shell formats, a piece only draws; JSON decoded into typed models (`ios/Packages/MyPaisaUI/Sources/MyPaisaUI/Pieces/HeroCoding.swift`) | XCTest and snapshots in `scripts/ios_gates.sh` | No fuzz or hostile-JSON case; card JSON from the api arrives later |
| RESILIENCE-1 to 4 (R) | None | C9 strips Debug hooks; C15 refuses the stub and probes in the Release app | Not sought: TestFlight only, a household's app |
| PRIVACY-1 to 4 (P) | No tracking; no third-party SDK that collects | `ios/MyPaisa/PrivacyInfo.xcprivacy` | The manifest must change with the first real data, and no scan reads it; leaving the household deletes the member (MA-172), planned |

## OWASP Top 10 for LLM Applications, 2025

Every control is planned (ARCHITECTURE §21.2); the only model call in the repository is the local stack's, with
no tools (`scripts/local/agents.py:84-110`). The check that will hold them is the T0 suite (MA-246, MA-247,
MA-249, MA-253), not built.

| Risk | Where §21.2 stops it | In §21.2's table | Gap |
| --- | --- | --- | --- |
| LLM01 Prompt injection | One way in for untrusted text; the quarantined extractor; taint drops outbound tools; Confirm | yes | Not built |
| LLM02 Sensitive information disclosure | Scope in the gate and in every read; nothing of a prompt in CloudWatch | yes | Not built; Anthropic's retention terms not recorded |
| LLM03 Supply chain | Pinned model snapshots; `uv.lock` with hashes (`Dockerfile:31-34`); C3, C7 | **no** | Add the row. The local agent uses a model alias |
| LLM04 Data and model poisoning | No training or fine-tuning; memory notes guarded (§22.3); eval cases from incidents | **no** | Add the row. Who may add an eval case or a recording, and that neither holds real data |
| LLM05 Improper output handling | Plain text and card fields under the CSP; SQL only in the locked DuckDB | yes | Not built |
| LLM06 Excessive agency | Least agency; the manifest; the gate; the second check | yes | Not built |
| LLM07 System prompt leakage | | **no** | Add the row. The repository is public, so the prompt is public: no secret, no rule that only the prompt enforces |
| LLM08 Vector and embedding weaknesses | | **no** | Not applicable: no embeddings or vector store. Say so |
| LLM09 Misinformation | The figure check; structured outputs; the plain template | yes | Not built |
| LLM10 Unbounded consumption | The ceiling, its guards, the tool-call cap | yes | Not built |

## OWASP Top 10 for Agentic Applications, 2026

| Risk | Where §21.2 stops it | In §21.2's table | Gap |
| --- | --- | --- | --- |
| ASI01 Agent goal hijack | As LLM01 | yes | Not built |
| ASI02 Tool misuse | The policy gate; strict schemas; caps | yes | Not built |
| ASI03 Identity and privilege abuse | Admin tools in code; the member as principal on every call | yes | Not built |
| ASI04 Agentic supply chain | | **no** | Add the row. In the product: our own tools and Anthropic's two server tools, no MCP. On the laptop: plugins, MCP servers, hooks and crew agents with the owner's rights (threat model, boundary 9; F3) |
| ASI05 Unexpected code execution | The model writes only SQL, in the locked DuckDB | yes | Not built |
| ASI06 Memory and context poisoning | §22.3 | yes | Not built |
| ASI07 Insecure inter-agent communication | Typed messages on the bus (§18) | yes | Phase 13 |
| ASI08 Cascading failures | Each agent's manifest and suite; change requests | yes | Phase 13 |
| ASI09 Human-agent trust exploitation | Confirm shows exactly what is written | yes | Not built |
| ASI10 Rogue agents | As ASI08 | yes | Phase 13 |

## CIS AWS Foundations Benchmark

Sections as in versions 3 to 5; the newest version's control numbers are not certain, so none are quoted.
Nothing checks the account against CIS today: trivy reads Terraform, not the account, and the account-wide
settings are in no Terraform of this repository.

| Section | Covered today by | Gaps |
| --- | --- | --- |
| Identity and Access Management | C11 for the guard; OIDC with no stored key (`infra/bootstrap/roles.tf`); MFA to assume the developer role | Root MFA, no root keys, no IAM user keys, the password policy, Access Analyzer: not in this repository and not examined (F1). Three roles hold `AdministratorAccess` |
| Storage | C10; S3 blocks, encryption and TLS (`s3.tf`) | The account-level public access block: not here. No MFA delete or Object Lock on the documents |
| Logging | Log groups with retention (`observability.tf`) | No CloudTrail trail, no Config, no S3 access logs in this repository. ARCHITECTURE §17.1 leans on CloudTrail for the prod put: only the 90-day history backs that |
| Monitoring | Alarms on functions, queues and spans to one topic | None of the benchmark's alarms (root use, IAM changes, sign-in without MFA, trail changes). An EventBridge rule on prod parameter changes costs nothing known; confirm the price before applying |
| Networking | No VPC, by decision (MA-283) | Not applicable until the VPC option is taken |

**To close it:** a `cis` mode that only reads, run by `crew:sec-scan` on Arun's yes: either a pinned `prowler`
through `uvx` under a role with `SecurityAudit` and ci-plan's denies, or a dozen read-only calls
(`iam get-account-summary`, `iam get-account-password-policy`, `iam list-users`, `cloudtrail describe-trails`,
`s3control get-public-access-block`, `accessanalyzer list-analyzers`, `configservice describe-configuration-recorders`,
`guardduty list-detectors`). It is planned, not built. Turning on a trail, Config or GuardDuty costs money: ask first
(`.claude/rules/aws-changes.md`).
