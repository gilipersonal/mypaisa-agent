# MA-291 spec: Phases 0 to 9: Prototype v4 and the v4 boards

Extracted on 29 Oct 2026 from ARCHITECTURE.md, PLAN.md, docs/trace.json, the figure sets and the boards, as the prototype's source. Quotes are exact; "AR" is ARCHITECTURE.md.

I mapped every file you named. Prototype v4 has **three** doors, not four: the iPad and the foldable appear only as frames inside the iPhone v4 boards and the iPad v4 board.

## 1. Prototype v4

**Files** (all in `/Users/arundutta/projects/mypaisa-agent/docs/design/app-v1/`): `Prototype v4.dc.html`, `prototype-v4.js`, `prototype-v4-pages.js`, `PrototypeV4Web/Phone/Chat/Pages.dc.html`.

**Steps** (`STEPS`, with the `STEP_T` titles). Each step is a run of beats in `B`; times come from each beat's `tm`.
1. "Sign in, Mon 26 Oct 09:40". The member taps Sign in with Apple. Page: sign-in, no chat.
2. "Register the first record, 09:41" (09:40–09:41). Tap the suggestion "£5,000 in Monzo savings", then Whose is it? → Arun, then Confirm. The chat shows "New savings · one question", then "Instant access savings · Monzo", saved, with the meta line "Net worth £439,951 → £444,951". Page: Home. On desktop Home sits beside the chat; on phones the chat is a tab.
3. "Register an SBI FD (a replay)" (09:44). Banner "Replay of Sun 25 Oct, 10:01". Cards: whose (Arun), then interest ("Added in, cumulative"). The Confirm card shows ₹6,17,538 on Sat 10 Mar 2029, saved at 10:03. Net worth stays £444,951.
4. "The valuation check-in, corrected in place, 09:52". The 09:00 card ("Are these still about right?": Home £415,000 and Flat, Pune overdue). Tap One by one, then Change it. The page switches to Home, Reading: tap the figure, type 428000, Save. A 09:43 exchange ("What can we get at quickly now?") is added to the chat. Net worth becomes £457,951.
5. "Activity and the 09:40 run" (09:53). Activity, then run r-1235.
6. "Sun 1 Nov: statements and the month close" (08:40–09:05, with a date banner). Tap +, Send, "Reading them…". The statement card has two amber lines: AMZN Mktp → Shopping, PAYPAL *EBAY → Other. Confirm at 08:44, which also shows the car-loan EMI as confirmed; net worth £456,493. At 09:00 the month-end check-in: "Nothing else: close October" (closed 09:02). Then the Budget page.
7. "Thu 5 Nov: the HDFC EMI check-in" (09:00–09:14). "Was November's EMI of ₹39,390 paid?" → Paid, saved at 09:12 with Undo for 6 s. Net worth £456,747. Then Debts, then the HDFC loan.
   - Side branch `BR` p1–p5 (09:04–09:22): Something else → Paid off in full → engine's figure ₹15,23,976 → Today → Confirm → loan closed → Back to the main path.
8. "The Projection" (10:05–10:06). Tap Arun's salary growth (4.8%), type 4.17 to see before → after, then Cancel.
9. "A what-if and a plan item" (10:20–10:21). `MSG_WI` → what-if card (2036: £1,446,000 against £1,539,000; cash flag at £15,377 below zero) → "Save as a plan item" → "Paid from where?" → "The monthly budget, then cash" → impact card → Cancel. Page: Projection with the chat.
10. "As Asha" (10:26). Switch the viewer in the top bar. The Projection loses its edit controls. Asha gets her own conversation and asks the same what-if; the card says "Only Arun can save it as a plan item."

**Beat fields:** `id, s, d, tm, t` (the target key), `p` (chat/guide/top/signin/a page), `v`/`jv` (view patch), `go`, `auto` (ms), `msg`, `sc` (scroll anchor), `fill`, `ban`, `asha`, `hint`.

**Pages** (`MP4P.page`; desktop and phone web use columns, iPhone a single flattened column):
- **Sign-in** (drawn in the Web/Phone boards): web is a two-pane hero and form with Apple, Google and passkey; iPhone is a Welcome screen with the app icon, Apple and Google.
- **Home:** hero "Household net worth" (£/₹, Household/Me/Asha, rate line, delta, live line), "What we own and owe", "By country", "By member", "Liquid and locked", "What's due", "Largest assets". "Everything else" appears on phone web and iPhone only.
- **Assets:** hero "What you own · household", Investments, Cash and savings, Property, Fixed term, Pensions.
- **Home, Reading:** a tap-to-edit figure (edit field with before → after), tags, chart, "The property", "Events".
- **Debts:** hero "What you owe · household", "The loans".
- **Home loan · HDFC:** left to pay and chart, "The loan", "Events".
- **Budget:** hero, "Plan against actual", "Income · October", "EMIs and SIP · October", a waiting banner.
- **Projection:** tabs Net worth/Plans/Budget forecast (only Net worth is live); horizon 5/10/20/30 yrs; "Today's money" switch (not wired); hero "Middle path in 2046" with fan chart, what-if chips, "Milestones", "Plan items", "Assumptions" (Returns; Pay, a year; Prices, a year; The budget with the £500 floor).
- **Activity:** "Today's runs", "Claude this cycle".
- **A run:** summary, "Steps · 7", "Model calls · 3", "Tool calls · 3", "What it proposed".
- **Audit:** "The audit log"; rows grow with the steps.
- **You:** "The household", "On this device" (privacy switch).
- **Navigation:** web sidebar has Home, Assets, Debts, Budget, Projection, Activity, Audit, You, plus an inert Admin center. Phone tabs are Chat, Home, Activity, You.

**State** (`fresh()`): `bi, br, brFrom, door` (desk/pweb/ios), `dark, priv, asha, v{page,chat}, typed, ev, ea, undoAt, banner, toast, nw, ccy, jump`, plus `ready`.
- Door and theme persist in localStorage (`mp4-door`, `mp4-dark`).
- Frame sizes: 1440×900, 390×844 (12 px bezel), 402×874 (13 px bezel), scaled to fit the window.
- **nw roll:** `nwTarget()` steps 439,951 → 444,951 (from s2f) → 457,951 (s4e) → 456,493 (s6g) → 456,747 (s7b). `componentDidUpdate` animates it over 750 ms with an ease-out cubic. It snaps instantly under reduced motion or after a step jump or restart.

**Public API:**
- `window.MP4 = {B, BR, STEPS, STEP_T, IX, FX, gbp, inr, P, pct, kv, para, note, hdr, lineRow, normPart, world, nwTarget, build, act, fresh, effTarget, first, charts:{fan, wi, home, hdfc}}`.
- `window.MP4P = {page}`.
- `build(st, api)` returns `{w, tgt, time, date, chat, composer, strip, page}`; `api = {act(key), now(), type(field), key(k)}`.
- `act(st, key, now)` is a reducer that returns a patch. Keys: `restart`, `step:n`, `next`, `branch`, `back`, `asha`, `priv`, `ccy`, `door:*`, `fill`, `nav:/tab:/link:/row:/run:/pback`, `kp:*`, and the beat's own target key. Anything else gives the "NOPE" toast.
- `effTarget` places the pulsing `.pnext` ring for each door, using `PARENT_PHONE`/`PARENT_DESK`.

**How the board mounts its parts:**
- The `helmet` loads `tokens.css`, `ios.css`, `motion.css/js`, `prototype-v4.js` and `prototype-v4-pages.js`.
- It polls until `MP4` and `MP4P` exist, then `dc-import`s `PrototypeV4Web` (`webp` props) or `PrototypeV4Phone` (`iosp` props).
- Each of those imports `PrototypeV4Pages` (`pagep`) and `PrototypeV4Chat` (`chatp`). All sub-boards just return their props from `renderVals`.

**CSS it relies on:**
- **From `ios.css`:** `.island, .sbar, .homebar, .nav, .gbtn, .ggroup, .gtext, .edge-bot, .tabdock, .tabs, .tab, .tabsearch, .lg`, `.strip/.strip-n, .composer, .chips, .gchip, .cbar, .cfield, .cplus, .csend`, the bubbles `.daysep, .me, .ai, .ai-mark, .ai-body, .ai-text, .ai-meta, .typing`, the cards `.ccard(-h/-b/-acts/-fold), .kv, .amber, .cbtn(-primary/-ghost)`, and `.appicon/.mark`.
- **Not used from `ios.css`:** the `.dev-*` frames. The prototype draws its own `.fr-desk/.fr-pweb/.fr-ios`, and the browser chrome is `PrototypeV4Web`'s own `.chrome/.dots/.url`.
- **From `tokens.css`:** `.mp, .t-light/.t-dark, .mp-app, .mp-shell(-side/-main/-tabs), .mp-side(-i), .mp-tabbar/.mp-tab, .mp-pagepad, .mp-pagehead, .mp-cols/.mp-col`, the hero `.mp-hero/.mp-hero-2`, the chips `.mp-chip` (with `mp-add/hold/pause/trim/neutral`, `chip-s`), `.mp-seg(-i), .mp-switch, .mp-btn*, .mp-toast, .mp-icontile, .mp-track`, the type classes, `.iconbtn`, `.ms`, and the mask variables `--mp-mask` and `--mp-mask-hero`.
- Rows, tiles and charts (`pline`, `prow`, `pc-*` and so on) are the sub-boards' own classes.

**Privacy masking** works in two layers:
- **CSS:** `.privon .mny` gets a mask background and transparent text. Inside the hero or a `.me` bubble it uses `--mp-mask-hero`; on glass, `--lg-mask`. Every figure in its own span carries `mny`.
- **`P(t, priv)`:** figures inside sentences are replaced by regex (`/[−+]?([£₹$])\s?[\d,]+(\.\d+)?(k|m)?/g` → `$1•••`). It is applied in `build` to chat texts, titles and parts, and in `fin()`/`mask()` to page subs, notes and cells.

## 2. The v4 boards not walked

**`app-v1/Web v4 · *.dc.html`:**
- **Shell and chat** (Turns 1–3):
  - Walked: "Browser · Shell 1a, Chat beside" (and phone · Home tab / · Chat tab), "Browser · Chat, a Confirm card", "Browser · Chat, sending a statement", "Browser · Home moves live", "Browser · Sign in", "Browser · Activity", "Browser · A run".
  - Not walked: "Shell 1b, Chat first", "Shell 1c, Ask bar" (docked / drawer open), "Chat, a reply streaming", "Chat, offline", "Web Push notification".
- **Dashboard:**
  - Walked: "Browser · Dashboard, net worth first" (Recommended). "in rupees" and "privacy on" are reachable through the toggles. Correcting a figure is walked on the asset page, not on Home.
  - Not walked: "two countries", "what's next", "first record", "empty", and "Correct a figure in place" as Home draws it.
- **Assets and debts:**
  - Walked: "Browser · Assets", "An asset", "Correct a value" (· saved), "Debts", "A loan".
  - Not walked: "Assets · filtered" / "filter sheet", "An asset, no history" (· your estimate), "A deposit", "A loan, phone · the what-ifs and the split", "Mortgage and car loan", "Mortgage", "Car loan".
- **Budget:**
  - Walked: "Browser · Budget", "Statement review" (top/end of the card, phone 1–3), "Statement answers a check-in", "Month-end check-in" (1–3).
  - Not walked: "Budget, correct a plan amount", and Budget in rupees (the currency control is inert).
- **Check-ins:**
  - Walked: "Check-in: EMI paid, then Undo" frames 1–2 (Undo is only a toast), and "Check-in: paid off in full" as the side branch.
  - Not walked: "3 of 4, Home scrolled to what we owe", "4 of 4, Undo: open again", and "Check-ins: several due at once" (Fri 20 Nov).
- **Projection:**
  - Walked: "the fan first" (Recommended), "a what-if in the chat", "as Asha sees it", "correcting an assumption" (cancelled), "the Net worth tab, phone", "Plan item in the chat, phone".
  - Not walked: "a story first", "decades", "in rupees at 2026 prices", "correcting a plan item", "after the plans".
- **Plans in the chat:** 2a's opening (the question, impact, Cancel) is walked in step 9. Not walked: "2b, one card that grows", "2c, compare side by side".
- **Plans in the chat 2a states** (Thu 5 Nov, 20:44–21:22), none walked: the two more ways, the pot in the November budget, the salary step, the HDFC closure, the wedding with cash below zero (ways to cover it, way 1 applied, undone), Asha asks, plans it cannot set up.
- **Plans tab** ("3a, bars on a timeline" Recommended, "3b, a timeline down the page") and **Plans tab 3a states** (privacy on, paused, resumed, corrected in place, ended, as Asha sees it): none walked.
- **Budget forecast** ("1a, the surplus first" Recommended, "1b, year by year", "1c, the ledger table") and **1a states** (after the pot, in rupees, in today's money, at 5, 10 and 30 years, privacy on, loading, error, empty, as Asha sees it): none walked.

**`ios-v1/iPhone v4 · *.dc.html`:**
- **Home:**
  - Walked: "Home, net worth first" (Recommended), plus "in rupees" and "privacy on" through the toggles.
  - Not walked: "two countries", "what's next", "first record", "empty", "Correct a figure in place", and "iPad · Whole wealth with the chat beside it" (1180 × 820).
- **Register:**
  - Walked: "Register a record: Monzo savings" (1–3), "Register a fixed deposit: SBI" (1–2), "Correct a figure in place: Home's value" (1–3).
  - Not walked: "Register a loan part-way through: HDFC", "Register a property: the Pune flat", "Register for another member: Asha's fund", "No history yet", "A new kind for the admin: Premium Bonds", "Privacy mode: a Confirm card".
- **Check-ins:**
  - Walked: card style 1b (Paid as the Confirm), "Check-in: a valuation due" (1–2), "EMI paid, then Undo · 1 of 2", "paid off in full" (1–3).
  - Not walked: options 1a and 1c, "Undo: open again", "not yet, or a different amount", "several due at once", "the card bill", "the SIP", "the saver matures", "Weekly digest: autopay assumed paid", "Lock screen: a check-in", "Privacy mode: a check-in".
- **Projection:**
  - Walked: "the fan first", "milestones and plan items", "the assumptions", "as Asha sees it", "correcting an assumption", "Chat, a what-if", "Chat, a what-if as Asha asks it", "Chat, adding a plan item".
  - Not walked: "a story first", "decades", "in rupees at 2026 prices", "correcting a plan item", "after the plans", "iPad · Projection, the Net worth tab".
- **Assets and debts** and **Budget:** these mirror the web lists with the "iPhone ·" prefix, and the same items are walked.
- **None walked:** Plans in the chat (and 2a states, which include iPad frames), Plans tab (and 3a states), Budget forecast (and 1a states), "Forecast" 1a/1b/1c for iPhone and iPad, and "Forecaster proof and chat" (Saturday review agree / disagree / no clear view / technical open, "Foldable · Forecast · folded/open", "Forecaster · Proof", "Forecast · a fund").

**`ios-v1/iPad v4 · Budget, assets and debts.dc.html`:** "iPad · Budget", "iPad · Assets", "iPad · An asset", "iPad · Debts", "iPad · A loan" (landscape). None walked.

## 3. First-generation boards (phases 1 and 8)

- **iPhone sign-in:** Welcome, Sign in with Apple, Sign in with Google, Joining from an invite, First-run setup, Notifications and Face ID, Sign-in refused.
- **iPhone settings:** You, Privacy and Face ID lock, Notifications and quiet hours, Sign-in methods, Pause and resume, Leave the household, "Lock screen: the morning brief", "Lock screen: a red alert", App switcher.
- **iPhone admin:** Admin center, Members and devices, "A member: sign out, pause, restore", Invite a member, Second check, Spend and the ceiling, Move the ceiling, Caps and alerts, Alert routing, Failed work and Replay.
- **iPhone audit and activity:** Audit, "Audit, a change from a file", Files, File preview, Activity (as it opens, scrolled to the end), A run.
- **Admin center 3** ("the admin screens and messages still missing (planned)"):
  - Admin · Spend: the guards, the renewal day, typing the hard limit, moving the ceiling past the credit or above the hard limit (refused), the ladder's steps, the AWS cap.
  - Admin · Alerts: routing, quiet hours, cooldowns and the digest, the queues' retries and backoff, the AWS cap's steps and forecast, "Replayed, and failed again".
  - Admin · People: your account paused, your account restored, Restore Asha, Asha restored, a failed fresh check, a household with only the owner.
  - Eleven Telegram messages, and "Email · An alert as it arrives".
- **Audit and files:** "Browser · Audit with files", "Browser · Files" (owner; viewer, empty), "Browser · File viewer" (image, PDF), "Telegram · Source button".
- **Browser 2** ("Activity, Audit, Login"): "Browser · Activity", "Browser · Audit", "Browser · Login".

## 4. The figure files

**`figures/household-v4.json`:**
- **`clock`:** today 2026-10-26 "Mon 26 Oct"; prices as of the "Fri 23 Oct close"; £1 = ₹112.50 (ECB). The README gives the later frames: Sun 1 Nov, Thu 5 Nov, Tue 10 Nov, Fri 20 Nov, Mon 14 Dec.
- **`members`, `assets` (16), `debts` (4):** the household and its records.
- **`new_record_in_prototype`:** Monzo savings, £5,000, Arun, 09:41.
- **`correction_in_prototype`:** Home £415,000 → £428,000 at 09:52, via inline edit, "your estimate".
- **Totals at each point:** `totals_before_new_record` (£439,951), `totals_after_new_record` (£444,951), `totals_after_correction` (£457,951), `totals_after_statement_sun_1_nov` (£456,493), `totals_after_hdfc_emi_thu_5_nov` (£456,747). Each has own, owe, net in £ and ₹, by country, by member and liquid.
- **`budget_oct`:** October's plan and actuals.
- **`statements_oct`:** Barclaycard (statement 1 Nov, due 20 Nov, £1,458) and Monzo.
- **`what_if`:** the £60,000 deposit in June 2028.
- **`check_ins`:** seven, from 26 Oct to 14 Dec.
- **`autopay_digest_week`:** the week of 19 Oct.
- **`projection`:** start, horizon, assumptions, priors, the three plan items, milestones; its runs point to `R26`.
- **`formatted`:** ready-made strings.

**`figures/future-plans-v4.json`:**
- **`clock`:** Thu 5 Nov, evening 20:41–21:22, which comes after the prototype's 10:05–10:26 Projection steps. Net worth £456,747; base run `R5N` (09:13).
- **`settings`:** the £500 floor, the surplus rule, the 20-year default horizon (choices 5/10/20/30), the cash rate, retirement.
- **`plans`:** existing, schooling, salary_step, hdfc_close.
- **`conversation`:** eight turns, 20:41–20:58.
- **`runs`:** R0 (Sun 1 Nov 09:03), R5N, R1 (20:43), R2 (20:46), R3 (20:53), R4 (20:59).
- **`impact`, `rearrange`:** the schooling shortfall and the ways to cover it.
- **`forecast`:** the year-by-year data behind the Budget forecast boards.
- **`later`:** the salary step and HDFC closure figures.
- **`R26`:** the Mon 26 Oct 09:53 run.
- **`what_if_26`:** the same what-if asked Mon 26 Oct 10:20.
- **`what_if_5nov`:** the version Prototype v4 uses (Thu 5 Nov 10:20).
- **`evening2`:** the Plans tab runs R5/R5b/R6/R7 (21:08–21:13) and the wedding (21:15–21:18).
