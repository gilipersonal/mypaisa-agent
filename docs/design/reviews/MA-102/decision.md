# MA-102: the Admin center, and a second check on Telegram sessions

## The request, in Arun's words (24 Oct 2026)

> "I should be able to invalidate any user/telegram session from Dashboard Admin center if needed (in case
> mobile or telegram session is hacked). Telegram session must be validated and secured somehow using some
> form of authentication."
>
> "I will go with Concept design 1, make the update in Claude Design and then also make the new screens for
> Admin and Authentication of Telegram as discussed."

Designed in MyPaisa DS v1, "Warm ledger", the system picked on MA-101.

## Where the designs are

| Page | What |
| --- | --- |
| [Admin center](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Admin+center.dc.html) | Two options for the page; the fresh check, pause and "this browser" flows; the Mini App's More list |
| [Telegram second check](https://claude.ai/design/p/0bf02ae1-2de2-42a8-98ff-96046b2a26d7?file=Telegram+second+check.dc.html) | Setup, the lock screen, the PIN, the check after Confirm, a new device, signed out and paused |

Both are in the MyPaisa app v1 project. Every frame is drawn in light and dark.

## The Admin center: two options

| Id | Name | In one line |
| --- | --- | --- |
| A | People first (recommended) | Members as cards on the left; the chosen member's live sessions and actions on the right, each action with its consequence; the security log under the members |
| B | Sessions first | One table of every live session in the household, the unconfirmed one on top; an "If a phone is lost" panel of three steps; the log as a timeline |

**Why A.** Signing out everywhere, pausing and unlinking all act on a person, so the person comes first. A keeps
B's best idea, putting the unconfirmed device at the top of the member's sessions. B is quicker to scan when a
household has many sessions. A two-person household doesn't.

Both options are owner only and browser only. Neither opens from the Mini App: the More list shows "Admin
center · Owner only · opens in your browser". Every action needs a **fresh check** (a passkey, or Google again)
that lasts 5 minutes. Destructive actions use the alert colour on its tint, never the coral primary. Your own
browser is marked "This browser" and is signed out from the account menu, not from the list.

## The Telegram second check (one design, as discussed)

- **Setup, the first time.** Turn on Face ID through Telegram's prompt, and set a 6-digit PIN for when Face ID
  isn't available. A card recommends Telegram's own two-step verification and says plainly that MyPaisa can't
  check it.
- **Locked after 12 hours.** A lock screen with no figures behind it: unlock with Face ID, or use the PIN.
  Three wrong PINs keep it locked for 15 minutes and tell the owner.
- **A change needs the check.** After Confirm on a change in the chat, Telegram opens the Mini App as a
  half-height sheet: "Check it's you", Face ID. The card then edits in place to "Saved · confirmed with Face
  ID". Reading stays one tap.
- **A new device.** The member is asked "Was this you?" [Yes, it was me] [No, sign it out]. The owner gets a
  message with [Open Admin center].
- **Signed out, and paused.** A plain message after "Sign out everywhere". A paused account gets one line from
  the bot, no buttons, and a locked Mini App with no figures.

## Decisions (Arun, 24 Oct 2026)

1. **Pausing ends every session.** Pausing a member's Telegram account also signs them out everywhere: the
   Mini App, a browser signed in with Telegram, and a browser signed in with Google. The bot answers one line
   and the Mini App locks until the owner restores it. (Recommended was Telegram-based sessions only; Arun
   chose the safer rule.)
   A paused member cannot sign back in anywhere: signing in with Google shows the paused screen and no
   figures. Only the owner lifts a pause.
2. **The owner can pause their own account, with a warning.** After a fresh check and a warning that it signs
   out this browser too. Restoring it means signing in with Google or the passkey. For when the owner's own
   phone or Telegram may be in someone else's hands.
3. **Alert becomes a truer red.** `--mp-alert` moves from #B42318 to #B5123F (light, 6.7:1 on white) and from
   #FF7B6B to #FF6B8B (dark, 6.3:1 on the surface), with tints #FCE4EA and #3A1724. It is a crimson, kept
   apart from the coral accent, so a destructive action never looks like the primary one. `tokens.css` in
   `docs/design/reviews/MA-101/` and both Claude Design projects carry it, and every page's hard-coded old red
   was replaced.

## What the build will touch

`handlers/api` (session check, Admin center endpoints, the fresh check), `src/mypaisa_agent/registry/` (member
`session_epoch`, `status`, passkey and PIN hash, sessions), `handlers/webhook` (refuse paused members),
`web/` (the Admin center page, the lock screen, the check sheet), `audit.py`, and `ARCHITECTURE.md` §1 and §4.5
for the one exception to the read-only web app.

## Review for glitches

Each page was rendered in a headless browser. The Admin center's boards were reflowed to 1280, 1024, 768, 600
and 390, and every board was measured for overflow, cut text, empty chips and icons drawn as words. The
screenshots were read in both themes, on the second-check page too. The agents fixed what they found (a coral
selection ring, cramped rows at 390, a timeline line past its last dot, orphaned words, chat cards wrapping).
I checked both pages again myself, and changed the lock-screen lockout so three wrong PINs keep it shut.

## The pick

**A, People first.** Arun, 24 Oct 2026, with the three decisions above. B stays on the page, marked "Not
picked". The build follows A once MA-32 and MA-74 to MA-77 are in.

Before the build, the picked option still needs its remaining states (design-first): the owner's Restore after
signing back in, its log row, a failed fresh check, and a household with only the owner.
