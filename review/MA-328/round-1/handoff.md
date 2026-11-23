# MyPaisa UI design assessment and Claude handoff

**5 November 2026 · MA-328 · Status: unreviewed draft for handoff.**

**Method:** single-author Impeccable design assessment of the adaptive product's HTML design boards, with rendered visual inspection and targeted source/browser observations. This is a review of the proposed UX and its design artifacts, not a production accessibility audit or verification of the native app. No UI fixes were made. Independent review of this report has not run.

**Conclusion:** keep Warm Ledger, the navy summary cards and the chosen Chat-first shell. The dark bottom navigation in Arun's screenshot is a reproducible theme-cascade defect, not an intentional reason to replace the visual direction. The other main problems are uneven design completeness and conflicting specifications: several polished-looking screens contain requirements prose, authentication states are mixed together, navigation varies between sources, and some prototype controls promise behavior they do not deliver.

There are **10 findings: 4 P1 and 6 P2; no P0 or P3 findings**. P1 means resolve before treating the affected design as an implementation-ready specification. P2 means resolve in the next design consolidation pass. These are design-handoff priorities, not evidence of shipped production failures.

## Scope and evidence

The assessed checkout was `main` at `b69fb34` (`b69fb34` was also `origin/main`). All figures, names and dates in the screens are the repository's illustrative household data. A screen's October/November date is its scenario clock, not the date of this assessment.

The inventory covers 23 iOS/iPad board files, 20 Web v4 board files, 8 design-system board files, Prototype v4 and its 4 supporting `.dc.html` modules, plus targeted interaction inspection of Prototype v5. The four PrototypeV4 helper modules are not standalone screens. Current product boards and their shared styles were the primary evidence; historical options and review folders were consulted for decisions, rather than treated as current defects. Architecture explainers, historical journey pages and Lucid exports are outside the product-screen assessment.

The 56 baseline `.dc.html` files were catalogued and the displayable files opened. The evidence folder holds 141 baseline captures, additional targeted screenshots, contact sheets and the original user reference. The browser inventory enumerated 848 device/browser frame elements across the baseline files. **This is not a claim that all 848 frames were individually inspected.** Visual inspection used representative frames across every UI family, light/dark and phone/desktop contact sheets, and full-size inspection of the findings. DS samples also included colour foundations, button states and navigation. The full per-file inventory and exact captured frame indexes are in [coverage.md](coverage.md) and [coverage.json](evidence/coverage.json).

Browser evidence was rendered in the Playwright Chromium session from a local static server, at the artboards' specified dimensions. Reduced Motion was enabled for stable captures; host colour scheme was deliberately changed for the theme reproduction. Typical artboards are iPhone 402 × 874, phone web 390 × 844, web 1440 wide and iPad 1180 × 820; some web boards intentionally expand vertically to show the whole page. Outer canvas scrolling and a long exported page are not themselves responsive defects.

The review follows Impeccable's Operate mode: clarity, task completion, familiar navigation and restrained expression. Its adaptive/native critique route does not use the web detector as a native-app quality signal. No `impeccable detect`, axe, Argos, retired board check, native build or native simulator audit was run. The current request authorizes this assessment; it does not reinstate permanent board gates retired under MA-303.

## The dark navigation issue

![The same light artboard with the browser in light mode and dark mode](evidence/navigation-comparison.png)

The left capture uses the existing light material. The right capture reproduces the reported defect without changing the design source.

| Observation | Light host | Dark host, same `.t-light` device |
| --- | --- | --- |
| `--lg-fill` | `rgba(255,255,255,0.86)` | `rgba(24,30,40,0.86)` |
| Inactive tab text | `rgb(20,23,31)` | `rgb(20,23,31)` |
| Active tab accent | Light-theme terracotta | Dark-theme pale coral |
| Shadow | Light-theme lift | Stronger dark-theme lift |
| Content surface | Light | Still light |

The mismatch also affects the top Privacy and Ask buttons. See the complete [normal light capture](evidence/01-home-light-host.png), [reproduction](evidence/02-home-dark-host.png), and [actual dark artboard](evidence/03-home-dark-artboard.png).

The computed inactive foreground is `#14171F`. A flat rendered tab-bar background sample at pixel `(210,837)` of the reproduction is `(56,60,68)`, producing approximately **1.62:1** contrast. This is an illustrative sRGB sample from this capture, not a measurement of every composited pixel or physical display at 25% brightness. It is far below the usual 4.5:1 minimum for normal text. An unselected but usable tab is not a disabled control. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

Apple describes Liquid Glass as a control/navigation layer above content; that is already the intended division in this repo. Fix the appearance resolution first, then judge whether any further shadow or opacity adjustment is needed. [Apple materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials)

## Findings and acceptance criteria

### F01 · P1 · Host dark mode overrides explicitly light glass

**Category:** theming, legibility. **Confidence:** reproduced, with source cause identified.

**Where:** [ds-v1/ios.css](../../ds-v1/ios.css), lines 10–47; identical copies in `ios-v1/ios.css` and `app-v1/ios.css`. The media rule at lines 35–47 targets `:root:not(.t-light):not(.t-dark) .mp`. A normal unforced HTML root therefore matches every descendant `.mp`, including a device that explicitly has `.t-light`. The rule overwrites glass fill, accent, lens and shadow. Content tokens still resolve from the light device, yielding dark glass with dark text. The `.lg::before` appearance is affected too.

**Impact:** inactive destinations, Search, Privacy and Ask become hard to read. The heavy dark shadow makes the navigation look detached from the warm content. Because the files are shared, patching the single Home screen would leave other screens broken.

**Claude's fix:** make the nearest explicit artboard appearance authoritative for every glass token and its pseudo-elements. Apply automatic host appearance only to genuinely unforced surfaces. Keep a complete light and dark material set; do not fix this by making every tab label white or by painting the nav white everywhere. Update the canonical DS file and mirror its copies. All four shared CSS/JS files currently match across the three directories; the problem is the shared rule, not an out-of-sync copy.

**Acceptance:** render explicit light, explicit dark and automatic appearance under both host schemes. Explicit light remains light; explicit dark remains dark; automatic follows the host. Inspect tab bar, Search, top toolbar, composer, sidebar and partial sheet over their actual backdrops. Check selected and unselected controls, Reduce Transparency and Increase Contrast. Preserve privacy, safe areas and the approved iOS/web material distinction. Use `/impeccable harden`, then `/impeccable polish`.

### F02 · P1 · Sign-in mixes signed-out and authenticated states

**Category:** state design, trust, onboarding. **Confidence:** visible in the drawn screens.

**Where:** [iPhone Sign-in and invite](<../../ios-v1/iPhone v4 · Sign-in and invite.dc.html>), lines 259–265; [Web Login, invite and responsive](<../../app-v1/Web v4 · Login, invite and responsive.dc.html>). Evidence: [iPhone welcome](evidence/board-21-frame-0.png), [web sign-in](evidence/board-40-frame-0.png).

The Welcome screen asks the user to sign in while showing linked/verified identities, a selected You tab, Home/Chat/Activity navigation, Search and Ask. The web version also shows the authenticated sidebar and a populated household conversation. The welcome card exposes relying-party and OAuth/PKCE details in user-facing copy. These may be useful implementation notes, but their placement makes the intended user state unclear.

**Impact:** Claude cannot reliably infer what is available before authentication, what identity information is already known, or what happens after a successful sign-in. A household member cannot tell whether they are signing in, linking another method or reauthenticating. This is a design ambiguity, not a claim that the running application exposes account data.

**Claude's fix:** draw distinct signed-out welcome, invite acceptance, sign-in-in-progress, cancelled/failed sign-in, expired/revoked invite and authenticated sign-in-method settings. Put linked identities in the authenticated settings state. Keep action-bound reauthentication as a separate confirmation flow. Move relying-party/PKCE details outside the device frame. Use the platform authentication component treatment and user-facing language such as “Sign in to your household.”

**Acceptance:** every auth frame declares its state outside the device; signed-out screens show only actions appropriate before authentication; successful authentication has an explicit destination; cancellation preserves the prior state; account-linking and second-check flows cannot be confused with first sign-in. Preserve invited-household-only access and the existing security contracts. Use `/impeccable onboard` and `/impeccable clarify`.

### F03 · P1 · Several screens are requirements summaries instead of actionable UI

**Category:** information architecture, interaction completeness. **Confidence:** visible and source-confirmed.

**Where:** [iPhone You and settings](<../../ios-v1/iPhone v4 · You and settings.dc.html>), lines 259–264; [iPhone Admin center](<../../ios-v1/iPhone v4 · Admin center.dc.html>), lines 259–265; [iPhone Audit, activity and files](<../../ios-v1/iPhone v4 · Audit, activity and files.dc.html>), lines 259–265. Corresponding web boards repeat the pattern. Evidence: [settings](evidence/board-22-frame-0.png), [admin](evidence/board-03-frame-0.png), [activity/audit](evidence/board-05-frame-0.png), [web guided-flow summary](evidence/board-35-frame-0.png).

Examples include a “Display currency & What MyPaisa remembers” row that explains settings without showing their controls; “New device alert” text describing Yes/No outcomes without drawing the decision; an Admin spend card explaining ceiling policy without an actual editing/confirmation flow; and a single Activity/Audit panel combining audit entries, tool runs, budget-health metrics, files and search results.

**Impact:** a developer would have to invent navigation, controls, selection states and failure handling. The screens look finished because they use finished cards, but important interaction decisions are absent. Operational detail competes with the everyday household task.

**Claude's fix:** turn each summary into the concrete task it describes. Separate ordinary Activity from audit detail, file browsing, search results and admin diagnostics. Settings should show a labelled setting, current value and action; the next screen should show the editor or confirmation. Keep the prose as annotations outside the app frame. Retain deeper technical detail behind a clearly labelled disclosure.

**Acceptance:** a reader can point to the action, its next state, its cancellation path and its saved/error state without interpreting a requirements paragraph. Show owner/admin/member variants where permissions change the controls. This does not authorize new non-chat creation forms or changes to the admin-only write rule. Use `/impeccable shape`, `/impeccable clarify` and `/impeccable distill`.

### F04 · P1 · Named edge states are sometimes only described

**Category:** state coverage, error recovery. **Confidence:** confirmed for the cited consolidated board; not a claim that these states are absent everywhere.

**Where:** [iPhone Holdings and India](<../../ios-v1/iPhone v4 · Holdings and India.dc.html>), lines 254–265. Its first section promises four currencies, privacy, stale prices, loading and empty states. The three Home frames are INR/light, USD/dark and EUR/privacy. Inside the device is a card titled “Empty, Loading & Stale-price states” that describes the behavior. Evidence: [privacy/edge-state summary](evidence/08-static-privacy-eur.png).

**Impact:** “loading shows calm placeholders” does not specify what stays visible, what becomes unavailable, what happens after failure, or how the user recovers. A weekend price-close label also does not by itself distinguish expected market closure from failed or delayed ingestion.

**Claude's fix:** replace the on-screen state-description card with actual separate states or precise links to existing canonical frames. Reuse the real empty/first-record states in the Home board and the offline/error/stream states in Web Shell and chat; do not redraw them independently. Distinguish loading, expected non-trading days, stale data and retrieval failure. Keep the previous valuation visible where the product contract permits it and label its age.

**Acceptance:** each promised state resolves to a named frame with visible status, retained/hidden data, permitted actions, recovery and the expected transition out. State coverage lists must distinguish drawn, planned and not applicable. Do not label all states complete because a heading names them. Use `/impeccable harden` and `/impeccable onboard`.

### F05 · P2 · The web navigation has several competing contracts

**Category:** consistency, findability. **Confidence:** confirmed across rendered sources.

**Where:** [DS Components 2](<../../ds-v1/Components 2.dc.html>), lines 112–155; [DESIGN.md](../../../../DESIGN.md), lines 288 and 328; [Prototype v5 controller](../../prototype-v5/prototype-v5.js), lines 34–41; the mobile Web v4 boards. Evidence: [DS navigation](evidence/ds-components-2.png), [mobile board overview](evidence/web-mobile-contact-sheet.jpg).

| Source | Compact web destinations |
| --- | --- |
| DS Components 2 | Overview, Holdings, Budget, Projection, More |
| DESIGN.md | Home, Assets, Projection, Chat, More |
| Prototype v5 | Chat, Home, Activity, You, More |
| Several consolidated Web v4 boards | Chat, Overview, Register, Projection, More |
| Some other Web v4 boards | Chat, Home, Activity, You; or Chat, Overview, Assets, Budget/Debts, More |

The same underlying area is also labelled Home or Overview, and Assets, Holdings and Register are used with different scopes. Platform-specific shell differences can be intentional; contradictory web shells for the same product cannot all be implementation specifications.

**Claude's fix:** establish one current navigation table with destinations, labels, order, selected states, nested routes and More contents. Reconcile it with the user's actual picks and trace before changing the information architecture. Make every current web board use that contract; mark historical alternatives explicitly. Keep the chosen iOS Chat/Home/Activity/You shell unless a separate decision changes it.

**Acceptance:** the same task has a predictable location on every current web screen; More contents and return paths are drawn; the DS and DESIGN.md describe the selected version. Labels stay stable across the journey and distinguish assets from the investment subset. Use `/impeccable shape` and `/impeccable clarify`.

### F06 · P2 · Prototype v5's Home scope selector is inert

**Category:** prototype integrity, state feedback. **Confidence:** exercised in the browser.

**Where:** [prototype-v5-ch-wealth.js](../../prototype-v5/prototype-v5-ch-wealth.js), lines 390–401; [prototype-v5-kit.js](../../prototype-v5/prototype-v5-kit.js), lines 102–104.

`homeHero()` draws Household, Me and Asha with `K.seg`, but supplies no `go` actions. Clicking Me leaves the selected Household segment, heading and total unchanged. `K.seg` also does not expose selected state through `aria-pressed` or equivalent. Under the Asha viewer, Me and Asha are both shown without clarifying that they refer to the same person.

**Impact:** someone using the clickable handoff may conclude that the scope filter is broken or that it intentionally changes nothing. It also leaves the filtered total, joint-share allocation, empty scope and permissions behavior unspecified. Static board buttons are not being judged as broken runtime controls here; this finding concerns the explicitly interactive prototype.

**Claude's fix:** wire the selector to the existing illustrative scope data and render the selected state, or visibly label this feature as a noninteractive design example outside the product frame. For the intended complete prototype, implement Household/current member/other permitted member behavior, including correct labels for the active viewer. Expose selected state to assistive technology.

**Acceptance:** clicking or keyboard-activating a scope updates the selected state, heading, totals and relevant supporting data coherently. Switching viewer does not leave duplicate person choices. Use `/impeccable harden`.

### F07 · P2 · The prototype buries core destinations below a long Home page

**Category:** task efficiency, navigation hierarchy. **Confidence:** source-confirmed and measured in the prototype.

**Where:** [prototype-v5-ch-wealth.js](../../prototype-v5/prototype-v5-ch-wealth.js), lines 411–415 and 484–485. Compare [iPhone Home](<../../ios-v1/iPhone v4 · Home.dc.html>), lines 108–110 and its summary-card navigation rows. Evidence: [prototype Home at the top](evidence/09-prototype-home-top.png).

In the measured iPhone dashboard scenario the page has an 820px scroll viewport and 5,359px of content. The first All assets button is roughly 3,981 rendered pixels below the viewport top. The “Everything else” destination list comes later. The early own/owe summary lacks the All assets and All debts rows that the static Home design already draws. Search remains an alternative, so this is friction rather than a blocked task. There are also two visible Search controls in the compact prototype.

**Claude's fix:** carry the summary-card routes from the selected static design into the prototype. Give assets and debts a clear route from their own summary; provide similarly contextual routes for Budget and Projection. Preserve the long supporting ledger for people who want it. Consolidate duplicate Search affordances only after checking the chosen compact shell.

**Acceptance:** a member can reach Assets and Debts directly from the initial summary without scrolling through several screens or guessing a search term. The static and clickable flows agree. Use `/impeccable layout` and `/impeccable distill`.

### F08 · P2 · Important explanatory copy and auth controls use caption-sized type

**Category:** typography, cognitive load. **Confidence:** observed and measured in the cited screens.

**Where:** [iPhone Sign-in and invite](<../../ios-v1/iPhone v4 · Sign-in and invite.dc.html>), lines 86–87 and 263–265; related consolidated Settings/Admin styles and screens. Compare the [DS button specimens](evidence/ds-components.png) and [sign-in screenshot](evidence/board-21-frame-0.png).

The sign-in buttons render at 12px despite being the primary task. The native design system's normal primary button specimen uses a 17px label; its small button uses 15px. Several consolidated screens put long, consequential instructions in 13px footnote text inside nested rows. This makes them visually denser and less readable than the better Home, asset and conversation designs.

**Impact:** the user must read small policy text to understand a primary action, especially on a phone at low brightness. The issue is hierarchy and reading effort, not a blanket claim that all 12–13px metadata is invalid or that the touch target is too small.

**Claude's fix:** restore the established body/control styles for primary task language and action labels. Keep compact type for brief supporting metadata and chart annotations. Reduce the amount of on-screen policy prose before increasing type, so the layout does not become a larger wall of text.

**Acceptance:** primary auth action labels use the agreed control style; consequential instructions read as body copy; metadata stays subordinate; the largest text settings retain complete labels and a usable flow. The sampled sign-in controls already measure 46px high, and the 44px toolbar controls meet the project's target-size floor; do not shrink them. Use `/impeccable typeset`, then `/impeccable clarify`.

### F09 · P2 · The design sources do not make the current specification unambiguous

**Category:** design-system governance, handoff reliability. **Confidence:** documented conflicts.

**Where:** [Home board](<../../ios-v1/iPhone v4 · Home.dc.html>), [Chart options](<../../ios-v1/iPhone v4 · Chart options.dc.html>), [MA-295 decision](../MA-295/decision.md), [DS Foundations](<../../ds-v1/Foundations.dc.html>) line 500, [DESIGN.md](../../../../DESIGN.md), and [design README](../../README.md).

The folder contains older screen-specific compositions, consolidated boards, selected chart options and Prototype v5, all reachable as normal design sources. For example, the Home file still presents its three structures as options/recommendations, while the chart decision selects Monzo Pulse and the prototype calls its Home picked. Foundations describes tertiary ink as suitable for axis ticks and unselected tabs, while the newer written rules reserve it for decoration and forbid it for meaningful labels. There are conflicting navigation definitions too (F05).

**Impact:** a fixer can choose a plausible source and still implement the wrong version. Archived decisions are valuable, but a file's existence, polished appearance or “Picked” badge is not enough to establish which parts supersede which earlier designs.

**Claude's fix:** add a concise current-spec map per screen: governing decision, canonical composition, component source, relevant states, prototype route and known gaps. Label the superseded portions of older boards while preserving their history. Reconcile current DS usage notes with the later legibility and product decisions. Do not promote an unpicked option merely to make the record look complete.

**Acceptance:** an implementer can identify one current composition and its selected chart/material treatment without comparing several contradictory pages. The map distinguishes Proposed, Picked and Implemented. Do not revive retired content gates or Claude Design sync. Use `/impeccable document`.

### F10 · P2 · “Foldable” does not clearly identify its platform contract

**Category:** platform conformance, adaptive design. **Confidence:** source mismatch; intended device interpretation needs to be made explicit.

**Where:** [DESIGN.md](../../../../DESIGN.md), line 224, states that Android foldables use crisp Web PWA paper chrome. [Prototype v5 controller](../../prototype-v5/prototype-v5.js), lines 24–29, defines the generic Foldable door as `app: true`; lines 276–288 render it using the iOS glass shell. The captured Foldable screen contains 12 `.lg` elements and the class `dev-fold-open ipad`. Evidence: [foldable capture](evidence/10-prototype-foldable.png).

**Impact:** an implementer could interpret this generic device as Android and reproduce the wrong navigation/material system. A future Apple foldable or an iPad size-class concept would be a different interpretation; the current label does not settle that.

**Claude's fix:** name the platform represented by the frame. If it represents Android, show the responsive web/PWA door on that width and posture, following the current written material contract. If it is an Apple adaptive concept, label it that way and keep Android's PWA example separate. Preserve the existing width-based chat placement; do not infer a new native Android product.

**Acceptance:** every foldable example identifies OS/door and folded/open state; its material, navigation and keyboard/inset expectations agree with that door. Use `/impeccable adapt` and `/impeccable document`.

## What should be preserved

- **The visual identity.** Warm stone, solid navy summaries, restrained terracotta actions and rounded large figures suit a private household ledger. The clean light-host screenshot demonstrates that this direction works without a redesign.
- **The better financial explanations.** “What we own and owe,” explicit currency conversion notes, dated valuations, and the Budget forecast's “Your leanest month, each year” make complex information understandable. Keep the plain-language takeaway, exact figures and deeper working.
- **Confirm and recovery patterns.** The register/check-in/plan sequences draw confirmation, saved receipts and Undo; these are useful foundations. Preserve their relationship to the immutable audit record and admin-only writes.
- **Privacy in the checked examples.** Prototype v5 Home masked the currency text and currency-valued accessible labels. The static EUR/privacy Home frame did too. This is evidence for those examples only, not every screen. Percentages remaining visible are intentional in the prototype's own privacy helper.
- **Adaptive intent.** The boards include wide layouts with chat beside the page, compact chat tabs, intermediate sheets and explicit AX5 examples. Keep that coverage. A browser drawing is not proof that the SwiftUI app supports Dynamic Type, VoiceOver, system gestures or actual safe areas.
- **Shared-file consistency.** `tokens.css`, `ios.css`, `motion.css` and `motion.js` are byte-identical across `ds-v1`, `ios-v1` and `app-v1` in the assessed checkout. Maintain that consistency while repairing F01.

## Impeccable heuristic assessment

These are qualitative judgments of the design artifacts, not production test scores. A 4 means the artifacts strongly demonstrate the behavior; a 2 means useful work exists but material design or handoff gaps remain.

| Heuristic | Score / 4 | Assessment |
| --- | --- | --- |
| Visibility of system status | 2 | Good dates, saved receipts and status labels; F01 hides control labels and F04 compresses different states into prose. |
| Match to the real world | 3 | Own/owe, currency and household concepts are clear; authentication/operations jargon interrupts this. |
| User control and freedom | 2 | Cancel/Undo patterns exist; F06's scope selector does not respond. |
| Consistency and standards | 1 | Navigation contracts and theme resolution conflict across current sources. |
| Error prevention | 3 | Confirmation and before/after patterns are strong; mixed auth states need separation. |
| Recognition rather than recall | 2 | Named sections help, but major destinations are buried and labels vary. |
| Flexibility and efficiency | 3 | Multiple doors, chat adjacency and inline corrections are well considered; their native runtime remains untested. |
| Aesthetic and minimalist design | 2 | Strong identity and useful card hierarchy; several screens contain dense specification prose. |
| Error recognition and recovery | 2 | Useful recovery examples exist; some consolidated state coverage is only a promise. |
| Help and documentation | 2 | Financial working is available; user help and engineering annotations need separation. |
| **Total** | **22 / 40** | **A coherent direction with substantial consistency and specification gaps.** |

For a first-time household member, the main emotional break is being asked to sign in while already seeing account and navigation state. For someone with reduced vision, the light-artboard/dark-glass combination is the most immediate barrier. For an admin making a consequential change, the strong confirmation pattern is reassuring, but a settings paragraph without the actual action sequence leaves too much to interpretation.

## Known planned work, not newly discovered defects

Plan-sync currently reports these as undrawn or unresolved. Include them in scheduling; do not silently add them to a cosmetic repair or claim the current boards already cover the whole roadmap.

| Existing story | Relevant gap recorded in the current plan |
| --- | --- |
| MA-35 | First-run preference confirmation and pause/privacy behavior have unresolved choices. |
| MA-70 | The 900–1133pt iPad/sidebar layout with chat sheet open needs its explicit drawing. |
| MA-76 | The action-bound second check for a Google-only member needs its explicit state. |
| MA-95 / MA-96 | Remaining privacy and detailed Budget/Forecast states are named in the trace. |
| MA-308 / MA-309 | Admin grant/take-back and delete/restore cards are still to draw. |
| MA-314 / MA-315 | Goals and the “what changed” attribution views are still to draw. |
| MA-316 / MA-317 | Digest/nudge/mute and scenario comparison/saved-scenario views are still to draw. |
| MA-318 / MA-319 | Sensitivity, chance-of-shortfall and forecast-calibration views are still to draw. |
| MA-320 / MA-322 | Tax-year fact/calendar cards and Plan with me start/end flows are still to draw. |

Use the current architecture/trace to resolve roles. The older design-first text contains permissions that newer PRODUCT.md and MA-307/308 supersede. The current rule is: admins write; creation and deletion start in chat; existing eligible figures can be corrected by an admin in place; other members view and change their own permitted preferences. Nothing here authorizes a change to those rules or any trading/market-recommendation functionality.

## Suggested sequence for Claude

1. **Repair the shared material cascade (F01).** This is the smallest change with the broadest visual benefit. Produce the six-case explicit/automatic × host-light/dark comparison before deciding on further styling changes.
2. **Establish source and navigation precedence (F05, F09, F10).** Use the recorded decisions; identify the few genuine decisions still needed. Do this before propagating a new shell across dozens of boards.
3. **Finish the incomplete task designs (F02–F04).** Start with auth and settings, then admin and audit/files/search. Link existing state drawings wherever they already answer the requirement. Follow design-first for genuinely new designs/options; do not mistake this report for approval of a new UX direction.
4. **Bring the clickable prototype into agreement (F06, F07).** Make scope selection meaningful and carry the contextual navigation already present in the static Home board.
5. **Polish type and density (F08).** Remove engineering prose, restore established control/body styles and inspect the same states across both appearances and doors. Finish with `/impeccable polish`.

For each finding, report the files changed, before/after screenshots, acceptance evidence and any unresolved design choice. Fix canonical sources and any generators that own the changed markup; confirm the owning generator from the file before regenerating. Do not rerun old generators blindly or restore their retired `--check` gates. Keep private artifact publishing and any PR/merge actions subject to the current user instruction.

## Verification handoff

| Area | Required evidence after fixes | Where to verify |
| --- | --- | --- |
| Appearance | Explicit light/dark/automatic under both host schemes; toolbar, tabs, composer, sidebar and sheet; worst actual backdrops | Design renders now; native/system-material behavior in the implemented app later |
| Readability | Primary/secondary/control labels follow project tokens; text and meaningful UI contrasts; low-brightness usability | Browser computed styles and rendered samples; physical display for the 25% brightness requirement |
| Navigation | One current route map; More, Search, selected tab, pushed page and return path | Current boards and clickable prototype |
| Authentication | Signed out, signing in, signed in, linking, second check, refusal/cancel/expired invite | Named states at both doors, then actual implementation |
| Role/state | Owner/admin/member, new/empty/loading/stale/error, before/after/save/undo | Existing acceptance and trace plus completed drawings |
| Adaptive layout | 320/390/440 phone widths; relevant 600/900/1133 thresholds; wide web and iPad; long GBP/INR and long names | Artboard inspection for design; actual app QA when requested |
| Accessibility | Dynamic Type/AX5, keyboard focus, VoiceOver order, selected-state announcements, keyboard-safe controls, Reduce Motion/Transparency | Built code and native runtime; do not infer success from HTML boards |
| Privacy | Amounts, axes, chart scrub/tooltip, accessible names, notifications and app-switcher presentation | Each affected state, followed by built code; current sampling is limited |

Do not turn this verification list into permanent automated checks on `docs/design`. MA-303 still applies. Proposed fixes need a visual decision where required; automated checks do not grant design approval.

## Validation and delivery status

- **Impeccable context:** loaded successfully, including PRODUCT.md, DESIGN.md and adaptive platform guidance. Critique and audit playbooks informed the assessment; no production technical score is claimed.
- **Visual evidence:** baseline captures and targeted theme, privacy, scope-control, phone-web, iPad/foldable and AX5 observations recorded. [Source hashes](evidence/source-hashes.json) pin the assessed files.
- **Plan-sync selftest:** reused its valid unchanged-code result from 4 November, as the repository permits; not represented as a fresh execution of every test.
- **Plan-sync check:** passed: 247 items, 0 drift, 61 informational notes. Existing notes include the planned gaps above. This checks the plan record, not visual quality.
- **PR file ownership check:** passed with `--key MA-328`: 0 product files changed against `origin/main`. The new report/evidence are uncommitted local artifacts; this is not a PR check for a future UI fix.
- **Report checks:** local link/image targets, cited source line bounds, evidence inventory, source hashes and whitespace are checked before delivery; results are recorded in [validation.txt](evidence/validation.txt).
- **Not run:** implementation test suites, full security pipeline, retired board gates, axe/Argos, native simulator/hardware/VoiceOver or full gesture/performance tests. No application, dependency, infrastructure or build source was changed. Full implementation and shipping gates belong to the later fix task.
- **Independent review:** not run; this report remains **unreviewed** until Arun opts in. The optional review should check source/evidence accuracy and UX/handoff completeness in separate fresh lanes. This repo asks again before a later review round.

Deliverable: this report, the per-file [coverage index](coverage.md), and the local [evidence directory](evidence/). No UI fixes, commits, pushes, PRs, merges, issue closures or design publishing were performed. MA-328 records the assessment; it is not a claim that the fixes are complete.

Questions about implementing the findings are deferred to Claude's fix pass. The only requested next decision for this assessment is whether Arun wants an independent review of the report.
