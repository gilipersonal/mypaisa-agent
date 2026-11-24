#!/usr/bin/env python3
"""The boards' icons are Lucide, as the web app's are (MA-340, from MA-301 f 1a, Arun, 2 Nov 2026).

    python3 scripts/board_icons.py

writes docs/design/ds-v1/lucide.js from the Lucide the web app ships (web/node_modules/@lucide/svelte, the version in
the web catalog): `window.MP_LUC`, each icon as one SVG path (its circles, rects, lines and polylines turned into path
commands), keyed by its Lucide name and by the older Material Symbols names the boards' data still uses (ALIASES).
Every board loads it (`<script src="../ds-v1/lucide.js">`) and draws an icon as

    <svg class="lc" viewBox="0 0 24 24" aria-hidden="true"><path sc-camel-d="{{ LUC.house }}"></path></svg>

(`.lc-s` and `.lc-l` for the small and large sizes; `{{ LUC[r.i] }}` when the name is data). A board's renderVals gets
LUC from the line its script ends with. To draw an icon not here, add its Lucide name to EXTRA and run this again; an
SF Symbol is named, never drawn (the app draws it). In the app the icons are SF Symbols.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "web" / "node_modules" / "@lucide" / "svelte" / "dist" / "icons"
OUT = ROOT / "docs" / "design" / "ds-v1" / "lucide.js"

# The Material Symbols names the boards drew until MA-340, and the Lucide icon each now draws. The choices follow
# MA-301's picks where it made one: the sidebar (Home house, Assets wallet, Debts landmark, Budget chart-pie, Projection
# trending-up, Activity history, rotate-ccw-clock since Lucide 1) and the kinds' glyphs on ds-v1's Kind icons board.
ALIASES = {
    "account_balance": "landmark", "account_balance_wallet": "wallet", "account_circle": "circle-user",
    "add": "plus", "add_card": "credit-card", "add_circle": "circle-plus", "add_comment": "message-square-plus",
    "admin_panel_settings": "shield-user", "all_inclusive": "infinity", "apartment": "building-complex",
    "ar_on_you": "scan-face", "arrow_back": "arrow-left", "arrow_back_ios_new": "chevron-left",
    "arrow_forward": "arrow-right", "arrow_upward": "arrow-up", "attach_file": "paperclip", "autorenew": "refresh-cw",
    "backspace": "delete", "badge": "id-card", "battery_horiz_075": "battery-full", "beach_access": "tree-palm",
    "bolt": "zap", "bookmark_add": "bookmark-plus", "calculate": "calculator", "celebration": "party-popper",
    "chat": "message-square", "chat_bubble": "message-circle", "check": "check", "check_circle": "circle-check",
    "chevron_left": "chevron-left", "chevron_right": "chevron-right", "close": "x", "cloud_done": "cloud-check",
    "cloud_off": "cloud-off", "construction": "construction", "content_copy": "copy", "credit_card": "credit-card",
    "credit_card_off": "credit-card", "currency_exchange": "arrow-right-left", "dark_mode": "moon",
    "date_range": "calendar-range", "description": "file-text", "devices": "monitor-smartphone", "diamond": "diamond",
    "directions_car": "car", "document_scanner": "scan-text", "done_all": "check-check", "donut_large": "chart-pie",
    "donut_small": "chart-pie", "edit": "pencil", "edit_note": "notebook-pen", "edit_square": "square-pen",
    "error": "circle-exclamation-point", "event": "calendar", "event_available": "calendar-check", "event_busy": "calendar-x",
    "event_note": "chart-pie", "event_repeat": "calendar-clock", "event_upcoming": "calendar-clock",
    "expand_less": "chevron-up", "expand_more": "chevron-down", "fact_check": "clipboard-check",
    "familiar_face_and_zone": "scan-face", "family_restroom": "users", "favorite": "heart", "filter_alt": "funnel",
    "flag": "flag", "flashlight_on": "flashlight", "flight": "plane", "folder": "folder", "forum": "messages-square",
    "function": "square-function", "functions": "sigma", "help": "circle-question-mark", "history": "rotate-ccw-clock",
    "home": "house", "home_work": "house", "hourglass_top": "hourglass", "info": "info", "insights": "activity",
    "inventory_2": "archive", "key": "key", "keyboard_arrow_down": "chevron-down", "list_alt": "list",
    "lock": "lock", "lock_clock": "lock", "menu": "menu", "mic": "mic", "more_horiz": "ellipsis",
    "notifications": "bell", "notifications_paused": "bell-off", "open_in_full": "maximize-2",
    "open_in_new": "external-link", "passkey": "key-round", "pause": "pause", "pause_circle": "circle-pause",
    "payments": "banknote", "percent": "percent", "person": "user", "phone_iphone": "smartphone",
    "photo_camera": "camera", "photo_library": "images", "picture_as_pdf": "file", "pie_chart": "chart-pie",
    "play_circle": "circle-play", "policy": "shield-check", "progress_activity": "loader-circle", "public": "globe",
    "real_estate_agent": "house-plus", "receipt_long": "receipt", "redeem": "gift", "refresh": "refresh-cw",
    "replay": "rotate-ccw", "request_quote": "file-text", "restart_alt": "rotate-ccw", "restaurant": "utensils",
    "right_panel_close": "panel-right-close", "savings": "piggy-bank", "schedule": "clock",
    "school": "graduation-cap", "science": "flask-conical", "search": "search", "shield": "shield",
    "shield_person": "shield-user", "shopping_bag": "shopping-bag", "shopping_cart": "shopping-cart",
    "show_chart": "trending-up", "signal_cellular_alt": "signal", "smartphone": "smartphone",
    "stacked_line_chart": "layers", "stop": "square", "subscriptions": "repeat", "summarize": "notepad-text",
    "task_alt": "circle-check-big", "timeline": "milestone", "touch_app": "pointer", "trending_down": "trending-down",
    "trending_up": "trending-up", "tune": "sliders-horizontal", "umbrella": "umbrella", "undo": "undo-2",
    "upload_file": "file-up", "verified": "badge-check", "view_sidebar": "panel-right",
    "view_timeline": "chart-gantt", "visibility": "eye", "visibility_off": "eye-off",
    "volunteer_activism": "hand-heart", "warning": "triangle-exclamation-point", "water_drop": "droplet", "wb_sunny": "sun",
    "wb_twilight": "sunrise", "wifi": "wifi", "work": "briefcase", "zoom_in": "zoom-in", "zoom_out": "zoom-out",
}
# Lucide names drawn by name and in no alias: the kinds' own glyphs on the Kind icons board.
EXTRA = ["scroll-text"]


def node(name: str) -> list:
    src = ICONS / f"{name}.svelte"
    if not src.exists():
        raise SystemExit(f"board_icons.py: Lucide has no icon {name!r} ({src})")
    m = re.search(r"__iconData = (\{.*?\});\n", src.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit(f"board_icons.py: cannot read the icon data in {src}")
    return json.loads(m.group(1))["node"]


def num(x: float) -> str:
    return f"{x:g}"


def element(tag: str, a: dict) -> str:
    """One element of a Lucide icon as path commands."""
    g = lambda k, d=0.0: float(a.get(k, d))  # noqa: E731
    if tag == "path":
        return a["d"]
    if tag in ("circle", "ellipse"):
        cx, cy = g("cx"), g("cy")
        rx = g("r") if tag == "circle" else g("rx")
        ry = g("r") if tag == "circle" else g("ry")
        return (f"M{num(cx - rx)} {num(cy)}a{num(rx)} {num(ry)} 0 1 0 {num(2 * rx)} 0"
                f"a{num(rx)} {num(ry)} 0 1 0 {num(-2 * rx)} 0")
    if tag == "line":
        return f"M{num(g('x1'))} {num(g('y1'))}L{num(g('x2'))} {num(g('y2'))}"
    if tag in ("polyline", "polygon"):
        p = [float(v) for v in re.split(r"[\s,]+", a["points"].strip())]
        d = f"M{num(p[0])} {num(p[1])}" + "".join(f"L{num(p[i])} {num(p[i + 1])}" for i in range(2, len(p), 2))
        return d + ("Z" if tag == "polygon" else "")
    if tag == "rect":
        x, y, w, h = g("x"), g("y"), g("width"), g("height")
        rx = g("rx", g("ry"))
        ry = g("ry", rx)
        if not rx:
            return f"M{num(x)} {num(y)}h{num(w)}v{num(h)}h{num(-w)}Z"
        return (f"M{num(x + rx)} {num(y)}h{num(w - 2 * rx)}a{num(rx)} {num(ry)} 0 0 1 {num(rx)} {num(ry)}"
                f"v{num(h - 2 * ry)}a{num(rx)} {num(ry)} 0 0 1 {num(-rx)} {num(ry)}h{num(-(w - 2 * rx))}"
                f"a{num(rx)} {num(ry)} 0 0 1 {num(-rx)} {num(-ry)}v{num(-(h - 2 * ry))}"
                f"a{num(rx)} {num(ry)} 0 0 1 {num(rx)} {num(-ry)}Z")
    raise SystemExit(f"board_icons.py: no path form for <{tag}>")


def main() -> int:
    if not ICONS.is_dir():
        print(f"board_icons.py: {ICONS} is missing: run `corepack pnpm@12.16.1 --dir web install` first", file=sys.stderr)
        return 2
    version = re.search(r"@lucide/svelte v([\d.]+)", (ICONS / "house.svelte").read_text(encoding="utf-8")).group(1)
    names = sorted(set(ALIASES.values()) | set(EXTRA))
    paths = {n: " ".join(element(t, a) for t, a in node(n)) for n in names}
    body = ",\n".join(f"    {json.dumps(n)}: {json.dumps(paths[n])}" for n in names)
    alias = ",\n".join(f"    {json.dumps(k)}: {json.dumps(v)}" for k, v in sorted(ALIASES.items()))
    OUT.write_text(
        f"""/* The boards' icons (MA-340): Lucide {version} (ISC licence, lucide.dev), as the web app draws them. Written by
   scripts/board_icons.py, never by hand. window.MP_LUC maps each Lucide name, and each older Material Symbols name the
   boards' data still uses, to one SVG path; a board draws <path sc-camel-d="{{{{ LUC.house }}}}"> inside an svg.lc. */
(function () {{
  var P = {{
{body}
  }};
  var A = {{
{alias}
  }};
  var L = {{}};
  for (var k in P) L[k] = P[k];
  for (var m in A) L[m] = P[A[m]];
  window.MP_LUC = L;
}})();
""",
        encoding="utf-8",
    )
    print(f"lucide.js: {len(names)} Lucide icons, {len(ALIASES)} older names, Lucide {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
