"""Domain card builders shared across iOS v1 and Web v4 consolidated 1a boards (MA-279)."""
from __future__ import annotations

from v4_kit import AF, TB, card_box, kv_rows, mask, money


def signin_welcome_card() -> str:
    return card_box(
        "Sign in to MyPaisa",
        '<span class="mp-chip chip-s mp-neutral">Passkey · Apple · Google</span>',
        '<p class="pp mp-foot">Private household wealth &amp; market copilot for Arun and Asha. Passkeys sit on <code>dashboard.mypaisapp.com</code> (relying party <code>mypaisapp.com</code>).</p>'
        '<div class="fx gap8 wrapr"><span class="btn-save">Sign in with Apple</span><span class="btn-ghost">Continue with Google</span><span class="btn-ghost">Use a passkey</span></div>'
        + kv_rows([
            ("Apple ID · arundutta@icloud.com", "Face ID passkey bound to this device", '<span class="mp-chip chip-s mp-add">Verified</span>'),
            ("Google · duttaarun2015@gmail.com", "OAuth 2.0 PKCE + fresh re-auth sheet for second checks", '<span class="mp-chip chip-s mp-neutral">Linked</span>'),
        ]),
    )


def invite_and_cancel_card() -> str:
    return card_box(
        "Invite link &amp; cancellation check",
        '<span class="mp-chip chip-s mp-pause">Single-use · 24h</span>',
        '<div class="note-box"><span class="mp-cap mp-w6">WEB INVITE LANDING · <code>dashboard.<wbr>mypaisapp.com/<wbr>join/7f3a…</code></span>'
        '<div class="mp-foot">Opened without the iPhone app: explains what MyPaisa is, links to <b>TestFlight</b> while private, and notes this link works once (joining completes in the iOS app, ARCHITECTURE §4.5).</div></div>'
        '<div class="edit-inline"><div class="fx jb ac gap8 wrapr"><span class="mp-cap mp-w6">CANCEL INVITE · CONFIRM + SECOND CHECK</span><span class="mp-chip chip-s mp-pause">Face ID / Passkey</span></div>'
        '<div class="mp-foot">Cancel pending invite for <b>asha.dutta@gmail.com</b>? Confirming prompts Face ID / passkey and writes audit row <b>#1845</b> (never cancels silently on tap).</div>'
        '<div class="fx gap8 wrapr"><span class="btn-save">Confirm &amp; verify</span><span class="btn-ghost">Keep invite</span></div></div>',
    )


def signin_refused_and_setup_card() -> str:
    return card_box(
        "Sign-in refusals &amp; first-run setup",
        '<span class="mp-chip chip-s mp-trim">Access guard</span>',
        kv_rows([
            ("Unlinked account refused", "unknown@gmail.com is linked to nobody in this household; ask the owner for a single-use invite.", '<span class="mp-chip chip-s mp-trim">Refused</span>'),
            ("Paused or removed member refused", "This member account is paused by the owner; sign-in is blocked until restored in Admin Center.", '<span class="mp-chip chip-s mp-pause">Paused</span>'),
            ("First-run setup · Asha joined", "Default currency GBP (4-currency switch live), quiet hours 22:00–07:30, Face ID app lock enabled.", '<span class="mp-chip chip-s mp-add">Ready</span>'),
        ]),
    )


def guided_flows_card(ccy: str = "GBP", priv: bool = False) -> str:
    buy_v = mask(money(200, ccy), priv)
    pune_b = mask("₹95,00,000", priv)
    pune_a = mask("₹96,50,000", priv)
    return card_box(
        "Guided flows · Create &amp; confirm in Chat",
        '<span class="mp-chip chip-s mp-add">Audited</span>',
        kv_rows([
            ("1 · Log a transaction (long-list picker)", f"Short list (Balanced, NASDAQ 100, Monzo Savings) · More (14 holdings) · Type the name → {buy_v} ISA buy.", '<span class="mp-chip chip-s mp-add">Confirm · Cancel</span>'),
            ("2 · Add a holding", "Vanguard FTSE All-World UCITS ETF (VWRL · LSE · GBP · Arun ISA) → draft_record card ready to confirm.", '<span class="mp-chip chip-s mp-neutral">Draft</span>'),
            ("3 · Update a valuation", f"Pune flat estimate {pune_b} → {pune_a} · owner valuation note + Confirm.", '<span class="mp-chip chip-s mp-neutral">Confirm</span>'),
            ("4 · Change a setting", "Morning brief time 07:30 → 07:00 UK · preference card with Confirm &amp; audit row.", '<span class="mp-chip chip-s mp-neutral">Confirm</span>'),
        ]),
    )


def currency_check_1b_card(priv: bool = False) -> str:
    p_typed = mask("£1,000", priv)
    r_rec = mask("₹1,12,500", priv)
    s_val = mask("£23,110", priv)
    return card_box(
        "Currency check (1b picked) &amp; screenshot confirm",
        '<span class="mp-chip chip-s mp-neutral">ECB Fri 23 Oct</span>',
        kv_rows([
            ("Pounds typed against rupee holding", f"Typed {p_typed} into Parag Parikh Flexi Cap (INR folio) · asks currency &amp; converts at £1 = ₹112.50 → {r_rec}.", '<span class="mp-chip chip-s mp-add">1b Flow</span>'),
            ('Ambiguous "$" &amp; two rupee holdings', 'Typed "$500": asks US dollar (USD), Australian or Singapore dollar; picks between Parag Parikh MF and Infosys NSE.', '<span class="mp-chip chip-s mp-pause">Clarify</span>'),
            ("Before daily ECB rates load", "Question card offers enter exact ₹ amount or wait for ECB feed (no estimate button shown before rates load).", '<span class="mp-chip chip-s mp-neutral">Safe</span>'),
            ("Confirm, Cancel &amp; dual-amount audit", f"Confirm card masks figures when Privacy is on; Cancel leaves ledger untouched; Audit row #1844 stores typed {p_typed} and recorded {r_rec}.", '<span class="mp-chip chip-s mp-add">Recorded</span>'),
            ("Screenshot valuation · Leave it out", f"Unmatched row skipped: Leave it out shows the matched value ({s_val}) to Confirm first — never saves on tap.", '<span class="mp-chip chip-s mp-pause">Confirm</span>'),
        ]),
    )


def research_and_commands_card(ccy: str = "GBP", priv: bool = False) -> str:
    bal_v = mask(money(22925, ccy), priv)
    split_v = mask(money(1200, ccy), priv)
    return card_box(
        "Stance cards (Buy / BUY), alerts &amp; commands",
        '<span class="mp-chip chip-s mp-add">Buy · 78%</span>',
        '<div class="note-box"><div class="fx jb ac gap8 wrapr"><span class="mp-sub mp-w6">Balanced · HOLD → Buy (78%) · ' + bal_v + '</span><span class="mp-chip chip-s mp-add">Buy · live</span></div>'
        '<div class="mp-foot"><b>Simple:</b> Trend &amp; momentum positive; ISA allowance open. Candidate <b>FTSE All-World</b> carries <b>BUY · 74%</b>. <code>/calls</code> lists every active stance.</div>'
        '<div class="mp-cap mp-ink2"><b>Cards carrying money (masked in Privacy):</b> portfolio, holding-profile, fund-vs-benchmark, bear-vs-bull, what-changed, and <b>no clear view</b> (holding value masked).</div></div>'
        + kv_rows([
            ("Week-6 amber alert (under 8-week gate)", "Volatility rose 3.4% on new holding · No stance line shown before the 8-week practice gate passes.", '<span class="mp-chip chip-s mp-pause">Amber · wk 6</span>'),
            ("First-of-month split prompt", f"Nov {split_v} ISA contribution: compares baseline rule split vs Forecaster-tilted split with Confirm &amp; Cancel.", '<span class="mp-chip chip-s mp-add">Confirm</span>'),
            ("Chat commands &amp; stale Confirm guard", '<code>/pause</code>, <code>/resume</code>, <code>/web</code> link to dashboard.mypaisapp.com; old messages ask "Still want this?" and expired Confirms are refused.', '<span class="mp-chip chip-s mp-neutral">Guarded</span>'),
        ]),
    )


def register_and_india_full_card(ccy: str = "GBP", priv: bool = False, show_edit: bool = True) -> str:
    uk_v = mask(money(AF["by_country_gbp"]["UK"], ccy), priv)
    in_v = mask(money(AF["by_country_gbp"]["IN"], ccy), priv)
    bal_v = mask(money(22925, ccy), priv)
    nq_v = mask(money(18420, ccy), priv)
    monzo_v = mask(money(37596, ccy), priv)
    pp_inr = mask("₹5,61,995", priv)
    pp_c = mask(money(561995 / 112.5, ccy), priv)
    infy_inr = mask("₹4,86,000", priv)
    pune_b = mask("₹95,00,000", priv)
    pune_a = mask("₹96,50,000", priv)
    mort_v = mask(money(246743, ccy), priv)
    edit_h = ""
    if show_edit:
        edit_h = (
            '<div class="edit-inline"><div class="fx jb ac gap8 wrapr"><span class="mp-cap mp-w6">CORRECTING IN PLACE · VIA: INLINE_EDIT</span><span class="mp-chip chip-s mp-neutral">Zero Add buttons</span></div>'
            f'<div class="mp-foot">Pune flat estimate: <b>{pune_b}</b> → <b>{pune_a}</b> · writes before/after audit row #1843. Monthly check-in due Sun 1 Nov.</div>'
            '<div class="fx gap8 wrapr"><span class="btn-save">Save correction</span><span class="btn-ghost">Cancel</span></div></div>'
        )
    return card_box(
        "Whole-wealth Register · UK (76%) &amp; India (24%)",
        f'<span class="mp-foot mp-ink2">UK {uk_v} · India {in_v}</span>',
        '<div class="mrows"><div><div class="fx jb ac gap8"><span class="mp-foot mp-w6">UK 76.1% · India 23.9%</span><span class="mp-cap mp-ink2">14 records · 2 owners</span></div>'
        '<div class="mp-track mbar has-tick posr" role="img" aria-label="United Kingdom 76.1% and India 23.9% of household net worth"><span class="mp-track-clip"><span style="width:76.1%;background:var(--mp-chart-line)"></span></span><span class="bartick" style="left:75%"></span></div></div></div>'
        + kv_rows([
            ("Monzo Instant Savings · UK Cash", "Household liquid reserve · +£5,000 recorded Mon 26 Oct", f'<span class="mp-sub mp-w6">{monzo_v}</span>'),
            ("Balanced (BlackRock MyMap 5) · UK ISA", "Arun · Fri 6 Nov review · Ask in Chat / Update", f'<span class="mp-sub mp-w6">{bal_v}</span><span class="mp-chip chip-s mp-add">Buy · 78%</span>'),
            ("iShares NASDAQ 100 UCITS ETF · UK ISA", "Asha · 30 similar days since 2015", f'<span class="mp-sub mp-w6">{nq_v}</span><span class="mp-chip chip-s mp-hold">HOLD · 64%</span>'),
            ("Parag Parikh Flexi Cap · CAMS MF", f"Asha · 46 SIPs (CAS-Oct-2026.pdf) · XIRR 10.7% · {pp_c}", f'<span class="mp-sub mp-w6">{pp_inr}</span>'),
            ("Infosys Ltd (INFY · NSE) &amp; HDFC NRE / SBI PPF", "Arun · Zerodha Demat + NRE deposit + PPF scheme", f'<span class="mp-sub mp-w6">{infy_inr}</span>'),
            ("London residential mortgage · UK Debt", "Joint · 4.15% fixed to Oct 2028", f'<span class="mp-sub mp-w6">{mort_v}</span>'),
        ])
        + edit_h,
    )


def brief_overlap_reports_card(ccy: str = "GBP", priv: bool = False) -> str:
    nw_v = mask(money(AF["net_gbp"], ccy), priv)
    return card_box(
        "Brief, Evening Wrap, Overlap &amp; Reports",
        '<span class="mp-chip chip-s mp-add">BUY · 74% candidate</span>',
        '<div class="note-box"><span class="mp-cap mp-w6">07:30 BRIEF &amp; 21:15 EVENING WRAP</span>'
        '<div class="mp-foot">8-week portfolio practice gate is in week 5 of 8: <b>until it passes, stances stay on each holding</b> rather than top-line portfolio action calls.</div></div>'
        + kv_rows([
            ("Cross-border Overlap · 18.4%", "Nvidia &amp; Microsoft appear across NASDAQ 100, Balanced and Parag Parikh Flexi Cap.", '<span class="mp-chip chip-s mp-pause">18.4% overlap</span>'),
            ("Candidate · Vanguard FTSE All-World", "Not held · replacing 20% tech sleeve lowers overlap to 12.1%.", '<span class="mp-chip chip-s mp-add">BUY · 74%</span>'),
            ("Track-record Scorecard &amp; Wealth Reports", f"12-month hit rate 68% across 22 calls · October PDF/CSV wealth report ({nw_v}) masks all amounts when Privacy is on.", '<span class="mp-chip chip-s mp-neutral">Report ready</span>'),
        ]),
    )


def forecaster_proof_and_states_card(ccy: str = "GBP", priv: bool = False) -> str:
    ncv_v = mask(money(6420, ccy), priv)
    return card_box(
        "Forecaster Proof, Switch-off &amp; Edge States",
        '<span class="mp-chip chip-s mp-add">Proof lab · 8.9%/yr</span>',
        '<div class="cstats">'
        '<div class="cstat"><span class="mp-cap mp-ink2">WALK-FORWARD</span><span class="mp-sub mp-w6 cstat-v">8.9% / yr</span><span class="mp-cap mp-ink2">2019–2026 lab</span></div>'
        '<div class="cstat"><span class="mp-cap mp-ink2">WORST FALL</span><span class="mp-sub mp-w6 cstat-v">−14% vs −31%</span><span class="mp-cap mp-ink2">HOLD calls held up</span></div>'
        '<div class="cstat"><span class="mp-cap mp-ink2">PRACTICE GATE</span><span class="mp-sub mp-w6 cstat-v">Week 5 of 8</span><span class="mp-cap mp-ink2">live stances on wk 9</span></div></div>'
        + kv_rows([
            ("No clear view card (Saturday review &amp; tab)", f"Royal London Short Term Money Market ({ncv_v}): signals conflict (50% up / 50% flat) → plain 'No clear view' card; value masked in Privacy.", '<span class="mp-chip chip-s mp-neutral">No clear view</span>'),
            ("Under 8 weeks, Stale prices &amp; Error state", "New holding (< 8 wks) shows history progress bar only; stale feed badges Fri 23 Oct close; feed timeout offers Retry.", '<span class="mp-chip chip-s mp-pause">Guarded</span>'),
            ("Switch off Forecaster overlays", "Member preference hides 4-week fan &amp; F8 pattern lines while keeping recorded ledger &amp; factual prices.", '<span class="mp-chip chip-s mp-neutral">Toggle</span>'),
        ]),
    )


def audit_activity_files_card(ccy: str = "GBP", priv: bool = False) -> str:
    monzo_d = mask(money(5000, ccy, sign=True), priv)
    sip_v = mask("₹10,000", priv)
    return card_box(
        "Audit ledger, Activity runs, Files &amp; Search",
        '<span class="mp-chip chip-s mp-neutral">Row #1844</span>',
        kv_rows([
            ("Audit #1844 · Monzo Savings +5,000", f"Mon 26 Oct 09:12 · Arun Confirmed in Chat · {monzo_d} (net worth £439,951 → £444,951).", '<span class="mp-chip chip-s mp-add">Confirmed</span>'),
            ("Audit #1843 · Pune flat inline correction", "Mon 26 Oct 08:55 · via: inline_edit · ₹95,00,000 → ₹96,50,000 (Arun · owner).", '<span class="mp-chip chip-s mp-neutral">Inline edit</span>'),
            ("Audit #1842 · CAS-Oct-2026.pdf imported", f"Sun 25 Oct 19:20 · 46 Parag Parikh SIPs ({sip_v}/mo) · tool extract_document → draft_record.", '<span class="mp-chip chip-s mp-neutral">PDF verified</span>'),
            ("Activity run #912 · Morning brief", "Tools: get_networth, get_portfolio, get_stances, get_signals, chart_series · 1.8s · $0.04.", '<span class="mp-chip chip-s mp-add">0 errors</span>'),
            ("Global Search · 'Parag Parikh'", "Matches 1 CAMS holding, 1 PDF file (CAS-Oct-2026.pdf) and 2 audit rows.", '<span class="mp-chip chip-s mp-neutral">4 hits</span>'),
        ]),
    )


def you_and_security_card() -> str:
    return card_box(
        "You, 4-Currency Default, Sign-ins &amp; Device Check",
        '<span class="mp-chip chip-s mp-neutral">Arun · owner</span>',
        kv_rows([
            ("Display currency &amp; What MyPaisa remembers", "Default currency GBP (switches GBP / INR / USD / EUR); 6 household &amp; member memory notes editable in place.", '<span class="mp-chip chip-s mp-neutral">GBP · 4 FX</span>'),
            ("Sign-in methods &amp; safe removal", "Apple ID + Google + MacBook Passkey. Removing a method requires Confirm &amp; signs out active sessions; removing the last method or linking someone else's account is refused.", '<span class="mp-chip chip-s mp-add">3 linked</span>'),
            ('New device alert · "Was this you?"', 'iPad Air sign-in holds unconfirmed in Members &amp; devices until answered ("Yes, it was me" / "No, sign it out") + notifies owner chat.', '<span class="mp-chip chip-s mp-pause">Confirm device</span>'),
            ("Unlink notice, Privacy lock &amp; Pause", "If owner unlinks Asha's Google sign-in, Asha receives an immediate push &amp; chat notice. App switcher blurs figures; Face ID lock &amp; quiet hours 22:00–07:30 active.", '<span class="mp-chip chip-s mp-neutral">Protected</span>'),
        ]),
    )


def member_whatif_web_card(ccy: str = "GBP", priv: bool = False) -> str:
    surp_v = mask(money(1850, ccy), priv)
    return card_box(
        "Member What-if Scenario &amp; Validator Guard",
        '<span class="mp-chip chip-s mp-neutral">Asha · member view</span>',
        f'<div class="note-box"><span class="mp-cap mp-w6">WHAT-IF SCENARIO (MEMBER VIEW · NO SAVE-AS-PLAN BUTTON)</span><div class="mp-foot">Asha tested "+£300/mo into ISA from Jan 2027" (monthly surplus stays {surp_v}). Member view explores projections freely with <b>no Save as a plan item button</b> (owner plans live on Plans).</div></div>'
        '<div class="note-box"><span class="mp-cap mp-w6">OVERRIDE VALIDATOR REFUSAL</span><div class="mp-foot">Refused ungrounded assumption "assume 19% guaranteed return": numbers must trace to the member\'s words or a named engine preset.</div></div>',
    )


def admin_spend_and_aws_card(ccy: str = "GBP", priv: bool = False) -> str:
    spent_v = mask(money(TB["spent_gbp"], ccy), priv)
    cap_v = mask(money(TB["ceiling_gbp"], ccy), priv)
    aws_u = mask(money(TB["aws"]["used_gbp"], ccy), priv)
    aws_c = mask(money(TB["aws"]["cap_gbp"], ccy), priv)
    return card_box(
        "Admin · Spend, $160 Hard Limit &amp; AWS Cap",
        '<span class="mp-chip chip-s mp-pause">Fresh check: Apple / Passkey / Google</span>',
        '<div class="mrows"><div><div class="fx jb ac gap8"><span class="mp-foot mp-w6">Claude cycle · $35.20 of $160 hard limit (22%) · renews Tue 3 Nov</span><span class="mp-cap mp-ink2">' + spent_v + " / " + cap_v + "</span></div>"
        '<div class="mp-track mbar has-tick posr" role="img" aria-label="Claude spend 22% of $160 hard limit"><span class="mp-track-clip"><span style="width:22%;background:var(--mp-meter)"></span></span><span class="bartick" style="left:85%"></span></div></div></div>'
        + kv_rows([
            ("Move ceiling &amp; Type the hard limit ($160 prod)", "Moving past $200 credit requires explicit yes; above hard limit is refused; moving ceiling below already-spent stops Claude at once (templates only).", '<span class="mp-chip chip-s mp-neutral">Guarded</span>'),
            ("Spend ladder, member share &amp; daily guards", "85% switches routine briefs to Haiku &amp; memory on-request; 95% pauses proactive runs; 100% templates only.", '<span class="mp-chip chip-s mp-add">85 / 95 / 100%</span>'),
            ("AWS £50 monthly cap &amp; forecast steps", f"Used {aws_u} of {aws_c} (forecast £3.10) · 50%, 80% &amp; 100% step alerts + forecast-over-cap alert active.", '<span class="mp-chip chip-s mp-add">Within cap</span>'),
        ]),
    )


def admin_people_routing_replay_card() -> str:
    return card_box(
        "Admin · People, Alert Routing &amp; Replay",
        '<span class="mp-chip chip-s mp-add">Push · App Chat · Email</span>',
        kv_rows([
            ("Members &amp; devices (Apple, Google, Passkeys)", "Arun (owner · cannot pause own account; sign out lost phone from You) · Asha (member · pause/restore or unlink sign-in behind fresh check).", '<span class="mp-chip chip-s mp-neutral">2 members</span>'),
            ("Alert routing matrix &amp; email privacy switch", 'Columns: Push, App Chat, Email. Holding-alert email is off by default with explicit "Include holding values in email" switch; quiet hours &amp; cooldowns configurable.', '<span class="mp-chip chip-s mp-neutral">Values off</span>'),
            ("Failed work Replay &amp; Owner Daily Digest", "3 jobs replayed by you at 08:30: 2 ran, 1 failed again (CAMS timeout) — matches owner's 08:35 daily digest in app Chat.", '<span class="mp-chip chip-s mp-pause">2 ran · 1 failed</span>'),
            ("Approvals, Agents, Incidents &amp; Agent Notes", "ChangeRequest approval behind fresh check; agent question &amp; owner instruction in Chat; per-agent memory notes inspect/clear.", '<span class="mp-chip chip-s mp-add">Healthy</span>'),
        ]),
    )
