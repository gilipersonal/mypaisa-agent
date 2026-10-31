"""Build the complete MA-279 consolidated 1a whole-wealth v4 board suite across iOS and Web.

Generates 14 self-contained .dc.html canvases (7 in docs/design/ios-v1/, 7 in docs/design/app-v1/)
from the canonical JSON figure sets in docs/design/figures/ and validates every canvas against
plan_sync's date, motion, shared-stroke, tool-name and retired-channel checks at build time.

Run:
  python3 docs/design/reviews/MA-279/build_consolidated_v4.py          (writes all 14 canvases)
  python3 docs/design/reviews/MA-279/build_consolidated_v4.py --check  (exits 1 on any drift)
"""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "scripts"))

import plan_sync as _ps  # noqa: E402
from v4_cards import (  # noqa: E402
    admin_people_routing_replay_card,
    admin_spend_and_aws_card,
    audit_activity_files_card,
    brief_overlap_reports_card,
    currency_check_1b_card,
    forecaster_events_and_gate_card,
    forecaster_proof_and_states_card,
    guided_flows_card,
    invite_and_cancel_card,
    member_whatif_web_card,
    register_and_india_full_card,
    research_and_commands_card,
    signin_refused_and_setup_card,
    signin_welcome_card,
    you_and_security_card,
)
from v4_kit import (  # noqa: E402
    DK,
    LT,
    board_section,
    browser_frame,
    card_box,
    doc_wrap,
    fold_or_portrait_frame,
    forecaster_1a_card,
    hero_1a,
    intro_turn,
    ipad_frame,
    iphone_frame,
    pillars_card,
    stage_manager_frame,
)


def _sheet_overlay(title: str, text: str) -> str:
    return (
        '<div class="sheet-card" role="dialog" aria-label="' + title + '">'
        '<span class="sheet-grab" aria-hidden="true"></span>'
        f'<div class="fx jb ac gap8"><span class="mp-sub mp-w6">{title}</span><span class="mp-chip chip-s mp-neutral">Sheet</span></div>'
        f'<div class="mp-foot mp-ink2">{text}</div></div>'
    )


# ---------------------------------------------------------------------------
# 7 Consolidated iOS v1 Canvases (iPhone, iPad, Foldable)
# ---------------------------------------------------------------------------

def ios_signin_and_invite() -> str:
    out = [
        intro_turn(
            "iOS",
            "MyPaisa iOS v1 · Sign-in and invite (v4)",
            "Consolidated 1a whole-wealth sign-in, passkey/Apple/Google authentication, single-use invite joining, web invite landing, invite cancellation with Confirm + second check, and refusal states.",
            "MA-32 · MA-73 · MA-97 · MA-102 · MA-168 · MA-170 · MA-185",
            "ARCHITECTURE §4.5, §4.6, §9.1",
            [("b1", "1 · Welcome & sign-in"), ("b2", "2 · Invite & cancel check"), ("b3", "3 · Refusals & first-run setup")],
        ),
        board_section(
            "1",
            "Welcome and sign-in (Apple, Google and passkey)",
            "MA-32 · MA-168 · MA-170",
            "Passkeys, Sign in with Apple and Google sign-in on mypaisapp.com with Light, Dark and system-alert parity.",
            [
                iphone_frame("iPhone · Welcome and sign-in · Light", LT, signin_welcome_card(), title="Welcome", tab="You"),
                iphone_frame("iPhone · Welcome and sign-in · Dark", DK, signin_welcome_card(), title="Welcome", tab="You"),
                iphone_frame(
                    "iPhone · Google OAuth system alert · Zoomed",
                    LT,
                    signin_welcome_card(),
                    title="Welcome",
                    tab="You",
                    dev_cls="dev-iphone z80",
                    overlay=(
                        '<div class="dim"></div><div class="sysalert lg lg-strong apple">'
                        '<span class="mp-hl">“MyPaisa” Wants to Use “google.com” to Sign In</span>'
                        '<span class="mp-foot mp-ink2">This allows the app and website to share information about you.</span>'
                        '<div class="fx gap8" style="margin-top:10px"><span class="sab">Cancel</span><span class="sab iosb">Continue</span></div></div>'
                    ),
                ),
            ],
            [("Passkey relying party:", "bound to mypaisapp.com so iOS autofill and dashboard.mypaisapp.com share credentials cleanly.")],
        ),
        board_section(
            "2",
            "Joining from an invite, web invite landing and cancel invite",
            "MA-32 · MA-73 · MA-102",
            "Single-use invite redemption in the iOS app, the browser fallback landing page with TestFlight guidance, and invite cancellation behind Confirm + Face ID + audit row.",
            [
                iphone_frame("iPhone · Joining from an invite · Light", LT, invite_and_cancel_card(), title="Join Household", tab="You"),
                iphone_frame("iPhone · Cancel invite confirm · Dark", DK, invite_and_cancel_card(), title="Invites", tab="You"),
            ],
            [("Never silent:", "cancelling an invite presents a Confirm card, runs the second check and writes audit row #1845.")],
        ),
        board_section(
            "3",
            "Sign-in refused and first-run setup",
            "MA-32 · MA-35 · MA-185",
            "Clear refusal cards for unlinked accounts or paused members, alongside Asha's first-run currency, quiet-hours and Face ID setup.",
            [
                iphone_frame("iPhone · Sign-in refused & first-run setup · Light", LT, signin_refused_and_setup_card(), title="Account Check", tab="You"),
                iphone_frame("iPhone · Sign-in refused & first-run setup · Dark", DK, signin_refused_and_setup_card(), title="Account Check", tab="You"),
            ],
            [("Access guard:", "only invited household members can link a sign-in method; paused accounts stay blocked until restored.")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · Sign-in and invite (v4)", "\n".join(out), include_ios=True)


def ios_chat_and_flows() -> str:
    strip_sheet = _sheet_overlay("Household Home Sheet · £444,951", "Tapped the glass household strip in Chat: opens Home as a sheet over the active conversation (UK £338,468 · India £106,483).")
    out = [
        intro_turn(
            "iOS",
            "MyPaisa iOS v1 · Chat and guided flows (v4)",
            "Consolidated 1a Chat home, glass household strip sheet, guided flows with long-list picker, 1b currency check, screenshot valuation Confirm, Buy/BUY research cards, week-6 amber alert, monthly split and commands.",
            "MA-34..39 · MA-63..69 · MA-80 · MA-91 · MA-125 · MA-145 · MA-156 · MA-163 · MA-169",
            "ARCHITECTURE §1, §2, §4.6, §8, §9.1..9.4, §11, §12",
            [("b1", "1 · Chat home & glass strip"), ("b2", "2 · Guided flows"), ("b3", "3 · Currency check 1b & screenshots"), ("b4", "4 · Buy/BUY cards & commands")],
        ),
        board_section(
            "1",
            "Chat home, streaming reply and glass household strip",
            "MA-34 · MA-36 · MA-163",
            "Chat-first home on the £444,951 household with the tappable glass household strip opening Home as a sheet over the conversation.",
            [
                iphone_frame("iPhone · Chat home & Home sheet · Light", LT, hero_1a("GBP") + strip_sheet, title="Chat", tab="Chat"),
                iphone_frame("iPhone · Chat home & streaming · Dark", DK, hero_1a("GBP") + guided_flows_card("GBP"), title="Chat", tab="Chat"),
            ],
            [("1a Chat first:", "Chat is the first tab on iPhone and opens Home over the conversation when the household strip is tapped.")],
        ),
        board_section(
            "2",
            "Guided flows: log transaction, add holding, update valuation and change setting",
            "MA-38 · MA-39 · MA-169",
            "Every write goes through a guided flow and Confirm card, including the long-list holding picker (short list, More and Type the name).",
            [
                iphone_frame("iPhone · Guided flows & long-list picker · Light", LT, guided_flows_card("GBP"), title="Guided Flows", tab="Chat"),
                iphone_frame("iPhone · Guided flows · Privacy on · Dark", DK, guided_flows_card("GBP", priv=True), title="Guided Flows", tab="Chat", priv=True),
            ],
            [("Confirm + Cancel:", "every mutation previews before/after values with Confirm and Cancel and logs an audit row.")],
        ),
        board_section(
            "3",
            "Currency check (1b) and screenshot valuations",
            "MA-37 · MA-156",
            "Picked 1b currency check across pounds-to-rupee holdings, ambiguous dollar symbols, pre-ECB rate guard, Privacy-masked Confirm, dual-amount audit row, and Leave-it-out screenshot confirmation.",
            [
                iphone_frame("iPhone · Currency check 1b & screenshot confirm · Light", LT, currency_check_1b_card(False), title="Currency Check", tab="Chat"),
                iphone_frame("iPhone · Currency check 1b · Privacy on", LT, currency_check_1b_card(True), title="Currency Check", tab="Chat", priv=True),
            ],
            [("Never saves on tap:", "Leave it out on an unmatched screenshot row previews the matched values to Confirm first.")],
        ),
        board_section(
            "4",
            "Research and stance cards (Buy and BUY), alerts, monthly split and commands",
            "MA-35 · MA-63..69 · MA-80 · MA-91 · MA-125 · MA-145",
            "Buy (78%) and candidate BUY (74%) cards, money-bearing card Privacy masking (no clear view included), week-6 amber alert with no stance line, first-of-month split, and /pause, /resume, /web.",
            [
                iphone_frame("iPhone · Stance cards, alerts & commands · Light", LT, research_and_commands_card("GBP", False), title="Research & Alerts", tab="Chat"),
                iphone_frame("iPhone · Stance cards · Privacy on · Dark", DK, research_and_commands_card("GBP", True), title="Research & Alerts", tab="Chat", priv=True),
            ],
            [("8-week gate:", "week-6 amber alert omits any stance line before week 8; Privacy masks every card carrying money.")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · Chat and guided flows (v4)", "\n".join(out), include_ios=True)


def ios_market_holdings_india() -> str:
    empty_card = card_box("Empty, Loading &amp; Stale-price states", '<span class="mp-chip chip-s mp-neutral">Edge states</span>', '<div class="mp-foot">First-day empty state invites logging holdings in Chat; loading shows calm placeholders; weekend badge marks Fri 23 Oct close.</div>')
    out = [
        intro_turn(
            "iOS",
            "MyPaisa iOS v1 · Market, holdings and India (v4)",
            "Consolidated 1a whole-wealth Home states (GBP, INR, USD, EUR, Privacy, stale prices, loading, empty), Brief & 21:15 Evening Wrap, Buy/BUY holdings, Overlap, Scorecard, India holdings and Reports.",
            "MA-55..69 · MA-78 · MA-84 · MA-88 · MA-91 · MA-97 · MA-153 · MA-171 · MA-173 · MA-181 · MA-213",
            "ARCHITECTURE §5.3, §9.1, §9.4, §11, §12, §16",
            [("b1", "1 · 4-Currency & Home states"), ("b2", "2 · Brief, Wrap, Overlap & Reports"), ("b3", "3 · Holdings, Technical & India")],
        ),
        board_section(
            "1",
            "Home whole-wealth states: four currencies, privacy, stale prices, loading and empty",
            "MA-171 · MA-181 · MA-213",
            "Switching GBP (£444,951), INR (₹5,00,56,988), USD ($578,436) and EUR (€520,593) from the header pill, plus Privacy masking and stale/empty states.",
            [
                iphone_frame("iPhone · Home in INR (₹5,00,56,988) · Light", LT, hero_1a("INR") + empty_card, title="Home · INR"),
                iphone_frame("iPhone · Home in USD ($578,436) · Dark", DK, hero_1a("USD", stale=True) + empty_card, title="Home · USD"),
                iphone_frame("iPhone · Home · Privacy on · EUR", LT, hero_1a("EUR", priv=True) + empty_card, title="Home", priv=True),
            ],
            [("Four currencies:", "all four ECB currencies format cleanly across 320..440 pt in Light, Dark and Privacy mode.")],
        ),
        board_section(
            "2",
            "Today's brief, 21:15 evening wrap, cross-border overlap, scorecard and reports",
            "MA-57 · MA-64 · MA-84 · MA-91 · MA-97",
            "07:30 morning brief and 21:15 evening wrap respecting the 8-week gate, cross-border fund overlap (18.4%), candidate BUY (74%), scorecard and Privacy-safe wealth reports.",
            [
                iphone_frame("iPhone · Brief, Wrap, Overlap & Reports · Light", LT, brief_overlap_reports_card("GBP", False), title="Brief & Overlap"),
                iphone_frame("iPhone · Reports & Overlap · Privacy on · Dark", DK, brief_overlap_reports_card("GBP", True), title="Reports", priv=True),
            ],
            [("Practice gate:", "until it passes, stances stay on each holding rather than top-line portfolio calls.")],
        ),
        board_section(
            "3",
            "Market holdings (Buy / BUY, technical pillars) and India (CAMS MF, NSE, NRE, PPF)",
            "MA-55 · MA-56 · MA-88 · MA-153 · MA-173",
            "UK ISA and India CAMS/NSE/NRE/PPF holdings on one ledger with Monzo Pulse 1a technical pillars, Why? / What-if sheets and inline figure corrections.",
            [
                iphone_frame("iPhone · Register, Market & India · Light", LT, register_and_india_full_card("GBP", False) + pillars_card(), title="Holdings & India"),
                iphone_frame("iPhone · Register, Market & India · Dark", DK, register_and_india_full_card("INR", False) + pillars_card(), title="Holdings · INR"),
            ],
            [("Cross-border ledger:", "shows native ₹ amounts alongside converted totals and audited inline corrections.")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · Market, holdings and India (v4)", "\n".join(out), include_ios=True)


def ios_audit_activity_files() -> str:
    out = [
        intro_turn(
            "iOS",
            "MyPaisa iOS v1 · Audit, activity and files (v4)",
            "Consolidated 1a Activity feed, tool run inspector, immutable Audit ledger (chat Confirms, inline edits, PDF imports), Files viewer and global Search.",
            "MA-40 · MA-71 · MA-79 · MA-149 · MA-196",
            "ARCHITECTURE §4.6, §8, §9.1",
            [("b1", "1 · Audit, Activity, Files & Search (Light, Dark & Privacy)")],
        ),
        board_section(
            "1",
            "Audit ledger, Activity run inspector, Files preview and global Search",
            "MA-40 · MA-71 · MA-79 · MA-149 · MA-196",
            "Every record change, CAS PDF import and agent tool run on the £444,951 household ledger with global search across holdings, files and audit rows.",
            [
                iphone_frame("iPhone · Audit, Activity, Files & Search · Light", LT, audit_activity_files_card("GBP", False), title="Activity & Audit", tab="Activity"),
                iphone_frame("iPhone · Audit, Activity, Files & Search · Dark", DK, audit_activity_files_card("GBP", False), title="Activity & Audit", tab="Activity"),
                iphone_frame("iPhone · Audit & Files · Privacy on", LT, audit_activity_files_card("GBP", True), title="Activity & Audit", tab="Activity", priv=True),
            ],
            [("Verified tools:", "Activity names exact ARCHITECTURE §8 tools (get_networth, get_portfolio, extract_document, draft_record).")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · Audit, activity and files (v4)", "\n".join(out), include_ios=True)


def ios_you_and_settings() -> str:
    out = [
        intro_turn(
            "iOS",
            "MyPaisa iOS v1 · You and settings (v4)",
            "Consolidated 1a You profile, 4-currency default, memory notes entry, Apple/Google/passkey sign-in methods, 'Was this you?' new-device check, Privacy/Face ID lock, quiet hours and lock-screen notifications.",
            "MA-59 · MA-76 · MA-77 · MA-172 · MA-288",
            "ARCHITECTURE §4.5, §9.1, §15.2, §24.6",
            [("b1", "1 · You, Sign-ins, Device Check & Notifications")],
        ),
        board_section(
            "1",
            "You, four-currency default, sign-in methods, new-device check and lock screen",
            "MA-59 · MA-76 · MA-77 · MA-172",
            "Manage GBP/INR/USD/EUR display currency, linked Apple/Google/passkey credentials, 'Was this you?' device verification, unlink alerts, Face ID lock and quiet hours.",
            [
                iphone_frame("iPhone · You, Sign-ins & Device Check · Light", LT, you_and_security_card(), title="You", tab="You"),
                iphone_frame("iPhone · You, Sign-ins & Device Check · Dark", DK, you_and_security_card(), title="You", tab="You"),
            ],
            [("Sign-in safety:", "removing the last sign-in method is refused; unlinking a member's sign-in notifies them immediately.")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · You and settings (v4)", "\n".join(out), include_ios=True)


def ios_admin_center() -> str:
    out = [
        intro_turn(
            "iOS",
            "MyPaisa iOS v1 · Admin center (v4)",
            "Consolidated 1a owner Admin Center behind Face ID / passkey / Apple / Google fresh check: Claude $160 hard limit, ceiling guards, AWS £50 cap steps, People & devices, Push/Chat/Email routing, and Replay (3 replayed, 2 ran, 1 failed again).",
            "MA-61 · MA-102 · MA-114 · MA-116 · MA-130 · MA-135 · MA-136 · MA-137 · MA-145 · MA-289",
            "ARCHITECTURE §4.5, §15.1, §15.2, §15.3, §24.6",
            [("b1", "1 · Spend, $160 Hard Limit & AWS Cap"), ("b2", "2 · People, Alert Routing, Replay & Approvals")],
        ),
        board_section(
            "1",
            "Spend, $160 hard limit, ceiling moves and AWS cap",
            "MA-114 · MA-116 · MA-137",
            "Claude cycle ($35.20 of $160 hard limit, renewing Tue 3 Nov), explicit-yes credit check, hard-limit refusal, stop-at-once when lowered below spend, and AWS £50 cap steps.",
            [
                iphone_frame("iPhone · Admin · Spend & AWS Cap · Light", LT, admin_spend_and_aws_card("GBP", False), title="Admin · Spend", tab="You"),
                iphone_frame("iPhone · Admin · Spend & AWS Cap · Dark", DK, admin_spend_and_aws_card("GBP", False), title="Admin · Spend", tab="You"),
                iphone_frame(
                    "iPhone · Admin · Second check Apple sheet",
                    LT,
                    admin_spend_and_aws_card("GBP", False),
                    title="Admin · Spend",
                    tab="You",
                    overlay=(
                        '<div class="dim"></div><div class="sheet lg lg-strong apple" style="z-index:60">'
                        '<div class="sheet-grab"></div>'
                        '<div class="sheet-h"><span class="mp-hl">Sign in with Apple</span><span class="xbtn"><span class="ms" aria-hidden="true">close</span></span></div>'
                        '<div class="fx ac gap12"><span class="fx col grow"><span class="mp-hl">MyPaisa</span>'
                        '<span class="mp-foot mp-ink2">Continue as Arun Dutta · Face ID second check</span></span></div></div>'
                    ),
                ),
            ],
            [("Fresh second check:", "every spend, cap or member action requires Face ID, passkey, Apple or Google re-authentication.")],
        ),
        board_section(
            "2",
            "Members and devices, alert routing, failed-work Replay, approvals and agent notes",
            "MA-102 · MA-130 · MA-135 · MA-136 · MA-137 · MA-145 · MA-289",
            "Apple/Google/passkey member management (no owner self-pause), Push/Chat/Email routing with holding-value email switch off by default, and Replay matching the owner's chat digest.",
            [
                iphone_frame("iPhone · Admin · People, Routing & Replay · Light", LT, admin_people_routing_replay_card(), title="Admin · Ops", tab="You"),
                iphone_frame("iPhone · Admin · People, Routing & Replay · Dark", DK, admin_people_routing_replay_card(), title="Admin · Ops", tab="You"),
            ],
            [("Consistent replay:", "3 jobs replayed at 08:30 (2 ran, 1 failed again) agrees across Replay and the 08:35 daily digest.")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · Admin center (v4)", "\n".join(out), include_ios=True)


def ipad_and_foldable_v4() -> str:
    chat_sheet = _sheet_overlay("Chat Sheet (600–1133 pt rule)", "Between 600 and 1133 pt, Chat opens as a sheet over the screen rather than squeezing a third column beside it (ARCHITECTURE §9.1).")
    out = [
        intro_turn(
            "iPad & Foldable",
            "MyPaisa iOS v1 · Adaptive iPad and foldable shell (v4)",
            "Follows the picked 1a width rule across every window: chat beside every screen from about 1133 pt, a sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over).",
            "MA-70 · MA-71 · MA-78 · MA-79 · MA-124 · MA-163 · MA-240",
            "ARCHITECTURE §9.1, §19.4, §19.7",
            [("b1", "1 · iPad Wide (1133+ pt) & Forecaster Proof"), ("b2", "2 · iPad Portrait / Regular & Foldable Open (880 pt)"), ("b3", "3 · Foldable Folded & iPhone Landscape (Compact)")],
        ),
        board_section(
            "1",
            "iPad Wide (from 1133 pt, chat beside): Home, Forecaster Proof, Audit and Admin",
            "MA-70 · MA-78 · MA-79 · MA-124 · MA-163",
            "Three-column wide layout from 1133 pt with sidebar, two-column workspace (including Forecaster Proof on iPad) and Chat beside.",
            [
                ipad_frame("iPad · Wide · Home, Register & Overlap", LT, register_and_india_full_card("GBP", False, show_edit=False), brief_overlap_reports_card("GBP", False), hero=hero_1a("GBP"), title="Home", side_on="Home"),
                ipad_frame("iPad · Wide · Forecaster Proof & Admin", DK, forecaster_1a_card("GBP"), forecaster_proof_and_states_card("GBP") + admin_spend_and_aws_card("GBP"), title="Forecast & Proof", side_on="Forecast"),
            ],
            [("Width threshold:", "below 1133 pt the right Chat column hides automatically and opens as a modal sheet from Chat.")],
        ),
        board_section(
            "2",
            "iPad Portrait (820 pt) and Foldable Open (880 pt): top tab bar and Chat sheet",
            "MA-70 · MA-71 · MA-163 · MA-240",
            "At 820 pt (iPad portrait) and 880 pt (unfolded foldable), navigation sits in a top tab bar and Chat opens as a sheet over Home or Audit — never as a cramped side column.",
            [
                fold_or_portrait_frame("iPad · Portrait 820 pt · Chat sheet & Sign-in", LT, "dev-ipad-p", signin_welcome_card() + chat_sheet + register_and_india_full_card("GBP", False, show_edit=False), title="Home", active_tab="Home"),
                fold_or_portrait_frame("Foldable · Open 880 pt · Home & Chat sheet", LT, "dev-fold-open", hero_1a("GBP") + chat_sheet, title="Home", active_tab="Home"),
                fold_or_portrait_frame("Foldable · Open 880 pt · Audit & Chat sheet", DK, "dev-fold-open", audit_activity_files_card("GBP", False) + chat_sheet, title="Audit", active_tab="Audit"),
                stage_manager_frame("iPad · Stage Manager · a 700 × 600 window · Light", LT, hero_1a("GBP")),
            ],
            [("ARCHITECTURE §9.1:", "clears MA-70 and MA-71: at 880 pt the unfolded foldable uses the top tab bar and a Chat sheet.")],
        ),
        board_section(
            "3",
            "Foldable Folded (380 pt) and iPhone Landscape: compact bottom tab bar",
            "MA-70 · MA-163 · MA-240",
            "A folded foldable (380 pt) and every iPhone in landscape stay in the compact class with the bottom tab bar.",
            [
                iphone_frame("Foldable · Folded 380 pt · Compact tab bar", LT, hero_1a("GBP"), title="Home", tab="Home", dev_cls="dev-fold-shut"),
                iphone_frame("iPhone · Landscape · Compact tab bar", LT, register_and_india_full_card("GBP", False, show_edit=False), title="Home", tab="Home", dev_cls="dev-iphone-l"),
            ],
            [("Always compact on iPhone:", "an iPhone keeps its compact tab bar in both portrait and landscape.")],
        ),
    ]
    return doc_wrap("MyPaisa iOS v1 · Adaptive iPad and foldable shell (v4)", "\n".join(out), include_ios=True)


# ---------------------------------------------------------------------------
# 7 Consolidated Web v4 Canvases (Desktop 1440 & Phone 390)
# ---------------------------------------------------------------------------

def web_login_invite_responsive() -> str:
    pwa_card = card_box("Installed PWA &amp; Responsive Breakpoints", '<span class="mp-chip chip-s mp-add">Standalone PWA</span>', '<div class="mp-foot">Installs cleanly from Safari/Chrome to a standalone window with zero legacy wrapper chrome; adapts across 320, 390, 768, 1024 and 1440 px.</div>')
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Login, invite and responsive",
            "Consolidated 1a Web sign-in (Apple, Google, passkey), refusal states, /join/<token> invite landing for devices without the iOS app, installed PWA and responsive widths.",
            "MA-32 · MA-73 · MA-77 · MA-183 · MA-185",
            "ARCHITECTURE §4.5, §9.1, §9.3",
            [("b1", "1 · Web Login, Invite Landing & Refusals"), ("b2", "2 · Responsive Overview & Installed PWA (1440, 1024, 390)")],
        ),
        board_section(
            "1",
            "Login, second sign-in refusals and /join/<token> invite landing (Desktop and 390)",
            "MA-32 · MA-73 · MA-77 · MA-185",
            "Sign in with Apple, Google or passkey on dashboard.mypaisapp.com, refusal cards for unlinked/paused accounts or already-linked methods, and the TestFlight invite page.",
            [
                browser_frame("Browser · Login, Refusals & Invite Landing · Desktop", LT, "w1440", "", signin_welcome_card() + signin_refused_and_setup_card(), invite_and_cancel_card(), title="Sign in & Invite", nav_on="Overview"),
                browser_frame("Browser · Login, Refusals & Invite Landing · Phone 390", DK, "w390", "", signin_welcome_card() + signin_refused_and_setup_card(), invite_and_cancel_card(), title="Sign in & Invite", nav_on="Overview"),
            ],
            [("Browser invite page:", "explains MyPaisa, links to TestFlight while private, and notes the invite token works once.")],
        ),
        board_section(
            "2",
            "Responsive whole-wealth Overview and installed PWA (1440, 1024 and 390)",
            "MA-183 · MA-240",
            "One browser and standalone PWA layout scaling cleanly from 1440 and 1024 (sidebar + Chat beside) down to 768 and 390/320 (bottom tab bar).",
            [
                browser_frame("Browser · Responsive Overview & PWA · 1024", LT, "w1024", hero_1a("GBP"), register_and_india_full_card("GBP", False, show_edit=False), pwa_card, title="Overview · Installed PWA", nav_on="Overview"),
                browser_frame("Browser · Responsive Overview · Phone 390", LT, "w390", hero_1a("GBP"), register_and_india_full_card("GBP", False, show_edit=False), pwa_card, title="Overview", nav_on="Overview"),
            ],
            [("Adaptive web shell:", "measured from 320 to 1920 px in Chromium and WebKit with zero horizontal clip.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Login, invite and responsive", "\n".join(out), include_ios=False)


def web_register() -> str:
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Register",
            "Consolidated 1a whole-wealth Web Register across UK and India assets and debts at desktop (1440) and phone (390), with 4-currency switching, in-place corrections (via: inline_edit) and monthly check-in links.",
            "MA-197 · MA-202 · MA-206 · MA-211 · MA-213 · MA-216",
            "ARCHITECTURE §1, §4.6, §5.3, §9.3",
            [("b1", "1 · Whole-wealth Register & Inline Correction (Desktop & 390)"), ("b2", "2 · Register 4-Currency (INR / EUR) & Privacy States")],
        ),
        board_section(
            "1",
            "Whole-wealth Register: UK and India assets, debts and inline correction (Desktop and 390)",
            "MA-197 · MA-202 · MA-206 · MA-211 · MA-216",
            "Every household asset and debt in one ledger with owner filtering, in-place before -> after figure correction (via: inline_edit) and zero Add buttons.",
            [
                browser_frame("Browser · Web v4 Register · Desktop Light", LT, "w1440", hero_1a("GBP"), register_and_india_full_card("GBP", False, show_edit=True), audit_activity_files_card("GBP", False), title="Whole-wealth Register", nav_on="Register"),
                browser_frame("Browser · Web v4 Register · Phone 390", LT, "w390", hero_1a("GBP"), register_and_india_full_card("GBP", False, show_edit=True), audit_activity_files_card("GBP", False), title="Register", nav_on="Register"),
            ],
            [("Rule 4:", "new holdings are created in Chat; existing figures are corrected in place with Save/Cancel and an audit row.")],
        ),
        board_section(
            "2",
            "Register states: INR and EUR currency switch and Privacy mode (Desktop Dark and 390)",
            "MA-181 · MA-213",
            "Whole-wealth Register switched to INR (₹5,00,56,988) in Dark mode and EUR (€520,593) with Privacy masking on.",
            [
                browser_frame("Browser · Web v4 Register in INR · Desktop Dark", DK, "w1440", hero_1a("INR"), register_and_india_full_card("INR", False, show_edit=True), audit_activity_files_card("INR", False), title="Register · INR", nav_on="Register", ccy="INR"),
                browser_frame("Browser · Web v4 Register · Privacy on · Phone 390", LT, "w390", hero_1a("EUR", priv=True), register_and_india_full_card("EUR", True, show_edit=True), audit_activity_files_card("EUR", True), title="Register", nav_on="Register", ccy="EUR", priv=True),
            ],
            [("Four currencies:", "GBP, INR, USD and EUR convert every register summary from the Fri 23 Oct ECB feed.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Register", "\n".join(out), include_ios=False)


def web_market_holdings_india() -> str:
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Market, holdings and India",
            "Consolidated 1a Web Overview, Market holdings (Buy / BUY stances, technical pillars, Ask in Chat / Update), cross-border Overlap, Scorecard, India (CAMS MF, NSE share) and Reports at 1440 and 390.",
            "MA-64 · MA-84 · MA-88 · MA-91 · MA-97 · MA-153 · MA-183 · MA-186 · MA-213",
            "ARCHITECTURE §5.3, §9.3, §9.4, §11, §12, §16",
            [("b1", "1 · Market Holdings, Overlap & India (Desktop & 390)"), ("b2", "2 · Whole-wealth Reports in Light & Privacy On")],
        ),
        board_section(
            "1",
            "Market holdings (Buy / BUY, technical), Overlap, Scorecard and India (Desktop and 390)",
            "MA-64 · MA-84 · MA-88 · MA-91 · MA-153 · MA-183",
            "UK ISA and India CAMS/NSE holdings with Buy (78%) and candidate BUY (74%) calls, technical pillars, cross-border overlap and buttons opening the web app's own Chat.",
            [
                browser_frame("Browser · Market, Overlap & India · Desktop Light", LT, "w1440", hero_1a("GBP"), register_and_india_full_card("GBP", False, show_edit=False), pillars_card() + brief_overlap_reports_card("GBP", False), title="Market & India", nav_on="Overview"),
                browser_frame("Browser · Market, Overlap & India · Phone 390", DK, "w390", hero_1a("INR"), register_and_india_full_card("INR", False, show_edit=False), pillars_card() + brief_overlap_reports_card("INR", False), title="Market & India", nav_on="Overview", ccy="INR"),
            ],
            [("Web Chat integration:", "Open chat, Ask in the chat and Update open the web app's own Chat column or 390 Chat tab.")],
        ),
        board_section(
            "2",
            "Whole-wealth Reports and 4-currency USD view (Light and Privacy mode, Desktop and 390)",
            "MA-97 · MA-181 · MA-213",
            "Household PDF/CSV wealth reports and USD ($578,436) view at desktop and 390, including full Privacy masking.",
            [
                browser_frame("Browser · Reports in USD ($578,436) · Desktop", LT, "w1440", hero_1a("USD"), brief_overlap_reports_card("USD", False), register_and_india_full_card("USD", False, show_edit=False), title="Reports · USD", nav_on="Overview", ccy="USD"),
                browser_frame("Browser · Reports · Privacy on · Phone 390", LT, "w390", hero_1a("GBP", priv=True), brief_overlap_reports_card("GBP", True), register_and_india_full_card("GBP", True, show_edit=False), title="Reports", nav_on="Overview", priv=True),
            ],
            [("Privacy on Reports:", "masks every currency value across report summaries, tables and Chat cards.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Market, holdings and India", "\n".join(out), include_ios=False)


def web_forecast_1a() -> str:
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Forecast (MA-281 1a)",
            "Redraws Web Forecast to MA-281's picked 1a ('the answer first') at desktop (1440) and phone (390): F8 candle patterns, 30 similar days since 2015, Forecaster in practice, UK fund & candidate track records, Proof lab, switch-off and no-clear-view states.",
            "MA-124 · MA-125 · MA-281 · MA-295",
            "ARCHITECTURE §19.4, §19.7",
            [("b1", "1 · Holding Forecast 1a (NASDAQ 100 & UK Fund)"), ("b2", "2 · Forecaster Proof, Switch-off, No Clear View & Monthly Split")],
        ),
        board_section(
            "1",
            "Holding · Forecast · 1a the answer first (NASDAQ 100 and UK fund, Desktop and 390)",
            "MA-124 · MA-281 · MA-295",
            "Plain-English 4-week probability first (52% higher), 60-day Monzo Pulse candles with F8 double-top neckline and −1% support, 30 similar days since 2015, and UK fund (Balanced) view.",
            [
                browser_frame("Browser · Holding · Forecast 1a · Desktop Light", LT, "w1440", "", forecaster_1a_card("GBP", False, uk_fund=False) + forecaster_events_and_gate_card(), forecaster_1a_card("GBP", False, uk_fund=True) + pillars_card(), title="Forecast · 1a Answer First", nav_on="Forecast"),
                browser_frame("Browser · Holding · Forecast 1a · Desktop Dark", DK, "w1440", "", forecaster_1a_card("GBP", False, uk_fund=False) + forecaster_events_and_gate_card(), forecaster_1a_card("GBP", False, uk_fund=True) + pillars_card(), title="Forecast · 1a Answer First", nav_on="Forecast"),
                browser_frame("Browser · Holding · Forecast 1a · Phone 390", LT, "w390", "", forecaster_1a_card("GBP", False, uk_fund=False) + forecaster_events_and_gate_card(), pillars_card(), title="Forecast", nav_on="Forecast"),
            ],
            [("30 similar days:", "counts 30 historical analogues since 2015 (18 of 30 higher for NASDAQ 100; 21 of 30 for Balanced), matching ARCHITECTURE §19.4.")],
        ),
        board_section(
            "2",
            "Forecaster · Proof, switch-off, no clear view (Light and Privacy) and monthly split (Desktop and 390)",
            "MA-124 · MA-125 · MA-281",
            "Walk-forward Proof lab (8.9%/yr, worst fall −14% vs −31%, HOLD calls held up), 8-week practice gate, switch-off toggle, No clear view card (Light & Privacy on), and first-of-month split prompt in Web Chat.",
            [
                browser_frame("Browser · Forecaster · Proof & States · Desktop", LT, "w1440", "", forecaster_proof_and_states_card("GBP", False), research_and_commands_card("GBP", False), title="Forecaster · Proof", nav_on="Forecast", chat_q="Show our November £1,200 ISA split options.", chat_a="Baseline rule splits £800 Balanced / £400 NASDAQ 100; Forecaster-tilted split puts £950 Balanced / £250 NASDAQ 100. Confirm or Cancel below."),
                browser_frame("Browser · Forecaster · Privacy on · Phone 390", DK, "w390", "", forecaster_proof_and_states_card("GBP", True), research_and_commands_card("GBP", True), title="Forecaster · Proof", nav_on="Forecast", priv=True),
            ],
            [("No invented stages:", "shows only ARCHITECTURE §19's walk-forward Proof lab and 8-week practice gate.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Forecast (MA-281 1a)", "\n".join(out), include_ios=False)


def web_chat_and_flows() -> str:
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Chat, currency check and You",
            "Consolidated 1a Web guided flows, 1b currency check, Buy/BUY research cards, You preferences, and member What-if scenario card (no Save-as-plan button) + override validator refusal at 1440 and 390.",
            "MA-39 · MA-156 · MA-172 · MA-223",
            "ARCHITECTURE §1, §4.5, §8, §9.3, §12",
            [("b1", "1 · Guided Flows & Currency Check 1b (Desktop & 390)"), ("b2", "2 · You Preferences & Member What-if Card (Desktop & 390)")],
        ),
        board_section(
            "1",
            "Guided flows and currency check 1b (Desktop and 390)",
            "MA-39 · MA-156",
            "Web guided flows (log transaction with long-list picker, add holding, update valuation, change setting) and 1b currency check across pounds/rupees, ambiguous $, pre-rate guard and Privacy mode.",
            [
                browser_frame("Browser · Guided Flows & Currency Check 1b · Desktop", LT, "w1440", "", guided_flows_card("GBP", False), currency_check_1b_card(False), title="Chat & Guided Flows", nav_on="Overview"),
                browser_frame("Browser · Guided Flows & Currency Check 1b · Phone 390", LT, "w390", "", guided_flows_card("GBP", True), currency_check_1b_card(True), title="Chat & Flows", nav_on="Overview", priv=True),
            ],
            [("Identical 1b flow:", "both iOS and Web log dual typed/recorded currency amounts on audit row #1844.")],
        ),
        board_section(
            "2",
            "You preferences, research cards and member What-if card (Desktop and 390)",
            "MA-172 · MA-223",
            "Web You preferences (4-currency default, sign-ins, memory notes) alongside Asha's member What-if scenario card (no Save as a plan item button) and override validator refusal.",
            [
                browser_frame("Browser · You & Member What-if · Desktop", LT, "w1440", "", you_and_security_card(), member_whatif_web_card("GBP", False), title="You & Scenarios", nav_on="Overview"),
                browser_frame("Browser · You & Member What-if · Phone 390", DK, "w390", "", you_and_security_card(), member_whatif_web_card("GBP", False), title="You & Scenarios", nav_on="Overview"),
            ],
            [("Member What-if:", "explores projections freely without the owner-only Save as a plan item button.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Chat, currency check and You", "\n".join(out), include_ios=False)


def web_audit_activity_files() -> str:
    pdf_viewer_ovl = (
        '<div class="ovl"><div class="viewer" role="dialog" aria-modal="true" aria-label="CAS-Oct-2026.pdf">'
        '<div class="vprev"><div class="vbar">'
        '<div class="vgrp"><span class="vbtn" role="button" aria-label="Previous page"><span class="ms" aria-hidden="true">chevron_left</span></span>'
        '<span class="mp-foot mp-ink2 nowrap">Page 1 of 4</span>'
        '<span class="vbtn" role="button" aria-label="Next page"><span class="ms" aria-hidden="true">chevron_right</span></span></div>'
        '<div class="vgrp"><span class="vbtn" role="button" aria-label="Zoom out"><span class="ms" aria-hidden="true">zoom_out</span></span>'
        '<span class="mp-foot mp-ink2">Fit</span>'
        '<span class="vbtn" role="button" aria-label="Zoom in"><span class="ms" aria-hidden="true">zoom_in</span></span></div></div>'
        '<div class="vstage"><div class="ph-page"><span class="mp-sub mp-w6">CAS-Oct-2026.pdf</span>'
        '<span class="mp-foot mp-ink2">Parag Parikh Flexi Cap · 46 SIP rows verified</span></div></div></div>'
        '<div class="vside"><span class="mp-hl">Extracted records</span>'
        '<span class="mp-foot mp-ink2">Audit #1842 · Sun 25 Oct · tool extract_document → draft_record</span></div></div></div>'
    )
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Audit, activity and files",
            "Consolidated 1a Web Audit ledger, Activity tool runs, Files PDF viewer (CAS-Oct-2026.pdf) and global Search aligned to the £444,951 household ledger at 1440 and 390.",
            "MA-40 · MA-71 · MA-79 · MA-149 · MA-184 · MA-196",
            "ARCHITECTURE §4.6, §8, §9.3",
            [("b1", "1 · Audit, Activity, Files & Search (Desktop Light, Dark & 390)"), ("b2", "2 · Files PDF Viewer Modal (CAS-Oct-2026.pdf)")],
        ),
        board_section(
            "1",
            "Audit ledger, Activity run inspector, Files PDF viewer and Search (Desktop and 390)",
            "MA-149 · MA-184 · MA-196",
            "Shows the exact same household-v4 audit rows (#1842..#1844), ARCHITECTURE §8 tool runs and uploaded PDFs across desktop and 390.",
            [
                browser_frame("Browser · Audit, Activity & Files · Desktop Light", LT, "w1440", "", audit_activity_files_card("GBP", False), register_and_india_full_card("GBP", False, show_edit=True), title="Audit & Files", nav_on="Audit & Files"),
                browser_frame("Browser · Audit, Activity & Files · Desktop Dark", DK, "w1440", "", audit_activity_files_card("GBP", False), register_and_india_full_card("GBP", False, show_edit=True), title="Audit & Files", nav_on="Audit & Files"),
                browser_frame("Browser · Audit, Activity & Files · Phone 390", LT, "w390", "", audit_activity_files_card("GBP", False), register_and_india_full_card("GBP", False, show_edit=False), title="Audit & Files", nav_on="Audit & Files"),
            ],
            [("Single ledger:", "matches iOS row-for-row across Monzo +£5,000, Pune flat inline edit and CAS-Oct-2026.pdf.")],
        ),
        board_section(
            "2",
            "Files PDF viewer modal and extracted records (CAS-Oct-2026.pdf)",
            "MA-79 · MA-149 · MA-184",
            "Side-by-side PDF preview and extracted record inspector above 780 px, stacking cleanly into a scrollable single-column dialog on narrower screens.",
            [
                browser_frame("Browser · Audit with files · PDF viewer open", LT, "w1440", "", audit_activity_files_card("GBP", False), register_and_india_full_card("GBP", False, show_edit=False), title="Audit & Files", nav_on="Audit & Files", overlay=pdf_viewer_ovl),
            ],
            [("Responsive viewer:", "switches from side-by-side preview + details to a stacked scrolling dialog below 780 px.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Audit, activity and files", "\n".join(out), include_ios=False)


def web_admin_center() -> str:
    out = [
        intro_turn(
            "WEB",
            "MyPaisa app v1 · Web v4 Admin center",
            "Consolidated 1a Web Admin Center at desktop (1440) and phone (390): $160 hard limit, ceiling guards, AWS £50 cap steps, Apple/Google/passkey People management, Push/Chat/Email routing, and Replay (3 replayed, 2 ran, 1 failed again).",
            "MA-76 · MA-102 · MA-114 · MA-116 · MA-130 · MA-135 · MA-136 · MA-137 · MA-145 · MA-184 · MA-289",
            "ARCHITECTURE §4.5, §15.1, §15.2, §15.3, §24.6",
            [("b1", "1 · Spend, $160 Hard Limit & AWS Cap (Desktop & 390)"), ("b2", "2 · People, Routing, Replay & Approvals (Desktop & 390)")],
        ),
        board_section(
            "1",
            "Spend, $160 hard limit, ceiling moves and AWS cap (Desktop and 390)",
            "MA-114 · MA-116 · MA-137 · MA-184",
            "Synced to the v4 spend cycle ($35.20 of $160 hard limit renewing Tue 3 Nov), fresh check offering Sign in with Apple, a passkey or Google again, and AWS £50 cap steps — adaptive down to 390 and 320 px.",
            [
                browser_frame("Browser · Admin · Spend & AWS Cap · Desktop Light", LT, "w1440", "", admin_spend_and_aws_card("GBP", False), admin_people_routing_replay_card(), title="Admin Center · Spend", nav_on="Admin"),
                browser_frame("Browser · Admin · Spend & AWS Cap · Phone 390", LT, "w390", "", admin_spend_and_aws_card("GBP", False), admin_people_routing_replay_card(), title="Admin · Spend", nav_on="Admin"),
            ],
            [("Phone-width ready:", "replaces desktop-only Admin center 2 & 3 with responsive v4 cards tested down to 320 px.")],
        ),
        board_section(
            "2",
            "People, alert routing, failed-work Replay, approvals and agent notes (Desktop Dark and 390)",
            "MA-102 · MA-130 · MA-135 · MA-136 · MA-137 · MA-145 · MA-289",
            "Apple/Google/passkey member management (no owner self-pause), Push/Chat/Email routing with Include-holding-values-in-email switch, and Replay (3 replayed, 2 ran, 1 failed again).",
            [
                browser_frame("Browser · Admin · People, Routing & Replay · Desktop Dark", DK, "w1440", "", admin_people_routing_replay_card(), admin_spend_and_aws_card("GBP", False), title="Admin Center · Ops", nav_on="Admin"),
                browser_frame("Browser · Admin · People, Routing & Replay · Phone 390 Dark", DK, "w390", "", admin_people_routing_replay_card(), admin_spend_and_aws_card("GBP", False), title="Admin · Ops", nav_on="Admin"),
            ],
            [("No retired channels:", "all alerts, digests and second-check notices route through Push, App Chat and Email.")],
        ),
    ]
    return doc_wrap("MyPaisa app v1 · Web v4 Admin center", "\n".join(out), include_ios=False)


TARGETS = {
    ROOT / "docs/design/ios-v1/iPhone v4 · Sign-in and invite.dc.html": ios_signin_and_invite,
    ROOT / "docs/design/ios-v1/iPhone v4 · Chat and guided flows.dc.html": ios_chat_and_flows,
    ROOT / "docs/design/ios-v1/iPhone v4 · Market, holdings and India.dc.html": ios_market_holdings_india,
    ROOT / "docs/design/ios-v1/iPhone v4 · Audit, activity and files.dc.html": ios_audit_activity_files,
    ROOT / "docs/design/ios-v1/iPhone v4 · You and settings.dc.html": ios_you_and_settings,
    ROOT / "docs/design/ios-v1/iPhone v4 · Admin center.dc.html": ios_admin_center,
    ROOT / "docs/design/ios-v1/iPad v4 · Adaptive shell and foldable.dc.html": ipad_and_foldable_v4,
    ROOT / "docs/design/app-v1/Web v4 · Login, invite and responsive.dc.html": web_login_invite_responsive,
    ROOT / "docs/design/app-v1/Web v4 · Register.dc.html": web_register,
    ROOT / "docs/design/app-v1/Web v4 · Market, holdings and India.dc.html": web_market_holdings_india,
    ROOT / "docs/design/app-v1/Web v4 · Forecast.dc.html": web_forecast_1a,
    ROOT / "docs/design/app-v1/Web v4 · Chat and guided flows.dc.html": web_chat_and_flows,
    ROOT / "docs/design/app-v1/Web v4 · Audit, activity and files.dc.html": web_audit_activity_files,
    ROOT / "docs/design/app-v1/Web v4 · Admin center.dc.html": web_admin_center,
}

FORBIDDEN = ("Admins only", "Wed 28 Oct", "Pause my account", "Also found:", "£24,110")


def validate_canvas(path: Path, html: str, tools: set[str]) -> None:
    for bad in FORBIDDEN:
        assert bad not in html, f"{path.name}: contains forbidden phrase {bad!r}"
    for label, errs in [
        ("date", _ps.date_errors(html)),
        ("motion", _ps.motion_errors(html)),
        ("stroke", _ps.stroke_errors(html)),
        ("telegram", _ps.telegram_errors(html, path.name)),
        ("tool", _ps.tool_errors(html, tools)),
    ]:
        assert not errs, f"{path.name}: {label}_errors -> {errs}"


def main() -> int:
    check = "--check" in sys.argv[1:]
    tools = _ps.agent_tools()
    drift = 0
    for path, fn in TARGETS.items():
        want = fn()
        validate_canvas(path, want, tools)
        have = path.read_text() if path.exists() else ""
        if check:
            if have != want:
                print(f"DRIFT: {path.relative_to(ROOT)}", file=sys.stderr)
                drift += 1
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(want)
            print(f"wrote {path.relative_to(ROOT)} ({len(want):,} bytes)")
    return 1 if drift else 0


if __name__ == "__main__":
    raise SystemExit(main())
