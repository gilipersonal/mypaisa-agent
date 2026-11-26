# Scanner gaps for this stack

Drafted 26 Nov 2026 (MA-363), corrected against the scanner work of the same story. What `scripts/security_scan.sh`
and the gates do not see, and what to add. Each item says **built** (in the script now) or **to add**.

## What MA-363 built

- `sast` on a Mac also runs `p/swift` and `p/mobsfscan` over the app's own Swift (`ios/MyPaisa`, `ios/MyPaisaCore`,
  `ios/Packages`), with `--exclude` for build output. Five `p/mobsfscan` best-practice rules are excluded by name,
  because they match a protection that is present (pinning, jailbreak detection, reversing resilience, keyboard
  cache). On Linux (CI's Security job, the weekly sweep) the Swift is left out and the run says so (MA-166).
- `swift-proof`: plants a Swift file with known faults in a temporary folder, runs the same rules, and fails if one
  fault is missed or a protection is counted. It fetches semgrep, so it runs on Arun's yes.
- `ios`: the laptop-only mode below, with `scripts/security/ios-allow.json` and a 26-case selftest
  (`scripts/security_scan_selftest.sh`, also `scripts/security_scan.sh selftest`) that runs offline.
- The last line of every run names what it left out: `security scans: all passed; not run: ...`.

## 1. semgrep rulesets

**In use** (`scripts/security_scan.sh`, `scan_sast`): `p/python`, `p/fastapi`, `p/typescript`, `p/javascript`,
`p/secrets`, `p/github-actions`, over `backend web scripts .github`; on a Mac, the Swift rules over the iOS folders
above.

**Swift (built, with limits).**

| Ruleset | Exists | What it gives |
| --- | --- | --- |
| `p/swift` | Yes | Without a login, 2 rules (UserDefaults storage; a WebView flag) and 65 withheld, as fetched on 26 Nov 2026. With `semgrep login`, the rest; that sends scan metadata to Semgrep, and the script runs with `--metrics=off` and no token. **Open question for Arun (F5).** |
| `p/mobsfscan` | Yes | MobSF's rules, in use. At least 24 for Swift: Keychain accessibility and ACL, biometrics, weak hash, insecure random, TLS minimums, logging, pasteboard, file protection, `UIWebView`, `loadHTMLString`, hard-coded secret, custom-scheme OAuth callback, unzip. Its resilience rules (jailbreak, pinning, reversing) and two keyboard rules are excluded by id |
| `p/ios` | Not sure it exists | Do not rely on it |
| Rules of our own, in `security/semgrep/swift/` | **To add** | The app's own invariants, which no registry holds: `kSecAttrAccessible*` must end `ThisDeviceOnly`; no `kSecAttrSynchronizable` true; no token, cookie or figure passed to `print`, `NSLog`, `os_log` or `Logger`; no `WKWebView` or `SFSafariViewController` outside one named file; no `UserDefaults` write of a token; no `URLSession` delegate that accepts a challenge by hand; no `http://` literal; `ProcessInfo.processInfo.environment` only under `#if DEBUG`; `UserDefaults` debug keys only under `#if DEBUG` or `MP_PROBES` |

Objective-C++ (`ios/MyPaisa/Fabric/*.mm`): semgrep's C and C++ rules are thin; these files are glue. Keep them
few and read them in review.

**TypeScript (to add).** The React Native shell in `ios/src` (and `ios/__tests__`) is still not a target: the
iOS folders in `scan_sast` are the Swift ones. Add `ios/src` to the targets, with `--exclude ios/build
--exclude ios/ReactNativeSPM`.

| Ruleset | Exists | Use |
| --- | --- | --- |
| `p/react` | Yes | The shell's `.tsx` |
| `p/owasp-top-ten`, `p/security-audit`, `p/cwe-top-25` | Yes | Broader audit rules; expect noise, triage once, then keep |
| `p/xss`, `p/jwt`, `p/insecure-transport`, `p/command-injection`, `p/sql-injection` | Yes | Narrow and cheap; `p/jwt` matters when the token code lands |
| `p/nodejsscan` | Yes | `scripts/*.js` |
| `p/dockerfile` | Yes | The Dockerfile, which nothing lints today (trivy reads only `infra/`) |
| `p/terraform` | Yes | Optional beside trivy |
| `p/trailofbits` | Yes | Python and workflows |
| `p/react-native` | Not sure it exists | Do not rely on it |

**Svelte.** semgrep does not parse `.svelte` (the script says so when `sast` ends). Whether CodeQL does is not
known. Until a planted finding proves otherwise, the only reader of component markup is eslint. So (to add):

- keep `svelte/no-at-html-tags` (in the recommended set) as an error, and add `svelte/no-target-blank`;
- add `eslint-plugin-no-unsanitized` (`innerHTML`, `insertAdjacentHTML`, `document.write`) and
  `eslint-plugin-security` (MA-267 already plans it);
- add one line to `scripts/web_gates.sh`: count `{@html` in `web/src` with `grep -c`, after reading a known
  string, and fail above zero;
- keep logic in `.ts` files beside the component, as the repository already does, since those are scanned.

**The gate itself** (lessons 12, 16, 49 of `.claude/rules/independent-review.md`):

- The rulesets are fetched at run time and not pinned. To add: either vendor a dated copy into
  `security/semgrep/registry/` and refresh it by pull request, or keep fetching and assert a floor (F10).
- To add: run with `--json` and fail when the rules run, or the files scanned for any language, fall under a floor.
  Today the script prints "no findings" whatever ran. `swift-proof` does this for Swift only.
- To add: one planted file per other language (`security/fixtures/`), scanned in a selftest, each of which must be
  found: a `.ts` `eval`, a Python `subprocess` with `shell=True`, a workflow with
  `${{ github.event.pull_request.title }}` in `run:`. The Swift one is built (`swift-proof`).
- semgrep and zizmor are pinned by version, not by hash, through `uvx`; gitleaks and osv-scanner are pinned by
  SHA-256. ARCHITECTURE §17.4 now says so (MA-363). To add, if wanted: lock semgrep and zizmor with a hashed
  requirements file.

## 2. The `ios` mode

`scripts/security_scan.sh ios`, laptop only (it reads plists with `plutil`; on Linux it exits 2 and `all` leaves it
out). Each check reads a known value first, so a check that sees nothing fails; each fault found later becomes a
selftest case on a mutated copy.

**a. The source (built):** every `Info.plist` under `ios/` (and each one an Xcode project or xcconfig names) and
every `.entitlements` file.

| Key | Rule | Status |
| --- | --- | --- |
| `NSAppTransportSecurity.NSAllowsArbitraryLoads` | absent or false | built |
| `NSAllowsArbitraryLoadsInWebContent`, `...ForMedia`, `NSAllowsLocalNetworking` | refused unless `ios-allow.json` lists the key under `ats.debug_only` with a reason; refused always in the Release app | built |
| `NSExceptionDomains` | each domain and its exact settings must be in the allow-list | built |
| `UIBackgroundModes` | each mode must be in the allow-list (none today) | built |
| Entitlement keys and values | each must be in the allow-list: `aps-environment`, `com.apple.developer.applesignin`, `com.apple.developer.associated-domains` (the dashboard's two hosts), `keychain-access-groups` (the app's own two ids) | built |
| `MPApiBaseURL`, `MP_API_BASE_URL` | `https://`, the environment's own host, no IP, no `localhost` | to add (`scripts/ios_gates.sh` checks the Release URL) |
| `CFBundleURLTypes` | absent, or exactly Google's reversed client id for that environment | to add |
| `LSApplicationQueriesSchemes` | absent or allowlisted | to add |
| `NS*UsageDescription` | only those in an allowlist (Face ID, camera, photos when their stories land); fail on location, contacts, microphone, Bluetooth, tracking | to add |
| `UIFileSharingEnabled`, `LSSupportsOpeningDocumentsInPlace` | absent or false | to add |
| `ITSAppUsesNonExemptEncryption` | present and false | to add |
| Any value that looks like a key | fail: a PEM header, `sk-ant-`, `AKIA`, `AIza`, `GOCSPX-` | to add (gitleaks reads the built bundle) |
| `aps-environment` | `development` only in Debug; `production` in an archive | to add |
| `get-task-allow` | false in an archive | to add |
| `com.apple.developer.default-data-protection` | `NSFileProtectionComplete` | to add |
| iCloud, HealthKit, network extension entitlements | absent | built (not in the allow-list, so refused) |
| `PrivacyInfo.xcprivacy` | `NSPrivacyTracking` false, no tracking domains; collected types match what the app sends, checked by hand when the api client changes | to add |

**b. The tree (to add).** Fail on any `*.p8`, `*.p12`, `*.pem`, `*.key`, `*.mobileprovision`, `.env*` or
`ExportOptions*.plist` holding a key, anywhere under the repository, tracked or not. Until it exists, the ignore
patterns MA-363 added to `.gitignore` and `ios/.gitignore` (F11) keep such a file out of `git add`.

**c. The built Release app** (`ios/build/DerivedData/Build/Products/Release-iphonesimulator/MyPaisa.app`, which
`scripts/ios_gates.sh` already builds; or `MP_DERIVED_DATA`). With no built app the mode says so and checks the
source only. Strings are read with `grep -c`-style checks, never `! ... | grep -q`.

| Look for | Why | Status |
| --- | --- | --- |
| The built `Info.plist`: every ATS rule above, with no Debug allowance; `NSAllowsLocalNetworking` gone | Proves the build phase at `project.pbxproj:405` | built (Release app only) |
| `localhost:8787`, `127.0.0.1:8787`, `api-dev.mypaisapp.com`, `MP_PROBES` in the binary and `main.jsbundle`; `MYPAISA_AUTH_STUB` in `main.jsbundle` | Local stack, the dev host and the Debug hooks in a prod build. The binary and bundle each must hold a known string first (`MPApiBaseURL`, `v1/health`), so an unreadable file fails | built |
| gitleaks over the app folder and the binary's `strings` output | Keys and tokens in the build | built |
| `MYPAISA_API_URL`, `MYPAISA_STATIC_MOTION`, `MYPAISA_VIEWPORT_WIDTH`, `mpProbe`, `auth/local` | Debug hooks and the stub | already refused by `scripts/ios_gates.sh`, not repeated |
| `mpBench` | Debug hook; not compiled out today (F12) | to add, or compile it out |
| `owner_arun`, `member_asha`, `viewer_guest` | The stub's members | to add |
| `http://` other than Apple's and W3C's schema addresses; `:8081` | Cleartext, Metro | to add |
| `dashboard-dev` in the prod app; prod's hosts in the Dev app | The wrong environment | to add (the Dev app is not built by the gate) |
| `/mypaisa-agent/`, `arn:aws:iam::`, the account id | Server-side names that have no place in the app | to add |
| `sourceMappingURL`, any `*.map` | Source maps | to add |
| The stub household's file names and a known figure from `web/src/lib/stub/household.json`, once the real api serves data | Stub data in a real build | to add |
| Files in the bundle: `*.p8`, `*.p12`, `*.pem`, `*.xcconfig`, `*.md`, `.env*`, a `*.mobileprovision` other than `embedded.mobileprovision` | Stray files | to add |
| `Frameworks/`: exactly `React`, `ReactNativeDependencies`, `hermesvm` | An unexpected framework | to add |
| `codesign -d --entitlements :-` on a signed archive: the entitlement rules above | What the phone will enforce | to add |
| `otool -hv`: `PIE`. `otool -Iv`: `___stack_chk_guard` present; `_CC_MD5`, `_CC_SHA1`, `_strcpy`, `_sprintf`, `_system`, `_popen` absent from the app's own binary | Hardening and banned calls | to add |
| `nm` on the app binary: no local symbols beyond what a stripped build keeps | Symbols | to add |

## 3. Other gaps (all to add)

| Gap | Where | Add |
| --- | --- | --- |
| The Lambda images are not scanned before they run | `.github/workflows/ci.yml:346-440` | `trivy image`, or read ECR's findings in `scripts/release.py` (F9) |
| The Dockerfile is not linted | `scripts/infra_gates.sh:67-68` reads `infra` only | `p/dockerfile`, or `trivy config` on the root |
| Terraform providers are not watched | `.github/dependabot.yml` has no `terraform` entry | Add it for the five roots |
| Swift packages are not updated | no `swift` entry | Add it for `ios/Packages/MyPaisaUI` |
| CI roles' trust is not asserted | | A case in the infra gate: each role's `sub` list from the plan, exactly (F2) |
| The guard has no case for PassRole, AssumeRole, re-trust, Route 53 | `scripts/infra_guard_check.py` | F6 |
| The live account against CIS | | The `cis` mode in the standards map |
| Headers, cookies and the 401 perimeter on a deployed host | planned as `scripts/smoke.py --security` | Build it with the first api route; add `__Host-`, `Origin` and `Referrer-Policy` to what it checks |
| The agent's guards | planned T0 suite | MA-246, MA-247, MA-249, MA-253 |
| Object-level authorisation | none | Tests per route and per object with the registry (MA-27, MA-270) |
| A new route with no authentication | none | One test: every route but a named allowlist depends on the auth dependency |
| Secrets a scanner cannot know | gitleaks defaults and `.gitleaks.toml` | A custom rule for `sk-ant-` if the default set lacks it, and for `AuthKey_*.p8` file names |
| Secret reads, prod puts and prod approvals in the lead's session | `.claude/settings.json` denies only `git push` forms | A deny list or a PreToolUse hook (F3); Arun's and the lead's to make |
