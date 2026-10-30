"""Write docs/design/prototype-v5/prototype-v5-data.js, Prototype v5's one figure set (MA-291).

It joins the figure sets the prototype draws from, each written and checked by its own script:

- household-v4.json (make_household.py): MA-193's household, its records, the totals at each step;
- forecaster-v4.json (make_forecaster.py): MA-281's Forecaster figures at the Fri 23 Oct close;
- future-plans-v4.json (make_future_plans.py): MA-264's plans and the Budget forecast;
- and Prototype v5's own sets, each with its make_*.py that asserts every claim over its own figures
  (lesson 38): talk-v5.json (phases 0, 1, 8), wealth-v5.json (phases 2 to 7, 9), engine-v5.json (phases 10 to 13, 15),
  news-share-v5.json (phases 14, 16), team-india-v5.json (phases 18 to 20).

Run: python3 docs/design/figures/make_prototype_v5.py   (from the repo root, or anywhere)
--check exits 1 if the data file is not what the figure sets make.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "prototype-v5" / "prototype-v5-data.js"
SETS = [
    ("household", "household-v4.json", True),
    ("forecaster", "forecaster-v4.json", True),
    ("plans", "future-plans-v4.json", True),
    ("talk", "talk-v5.json", False),
    ("wealth", "wealth-v5.json", False),
    ("engine", "engine-v5.json", False),
    ("newsShare", "news-share-v5.json", False),
    ("teamIndia", "team-india-v5.json", False),
]


def build() -> str:
    data = {}
    for key, name, required in SETS:
        p = HERE / name
        if not p.exists():
            if required:
                raise SystemExit(f"make_prototype_v5: {name} is missing")
            data[key] = None
            continue
        data[key] = json.loads(p.read_text(encoding="utf-8"))
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return (
        "/* MyPaisa · Prototype v5 (MA-291): the figure set, written by docs/design/figures/make_prototype_v5.py "
        "from the figure sets it names. Do not edit by hand. Illustrative figures and names. */\n"
        "window.MP5D = " + body + ";\n"
    )


def main() -> int:
    text = build()
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print("make_prototype_v5: prototype-v5-data.js is stale: run python3 docs/design/figures/make_prototype_v5.py")
            return 1
        print("make_prototype_v5: prototype-v5-data.js is current")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(HERE.parent.parent.parent)} ({len(text):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
