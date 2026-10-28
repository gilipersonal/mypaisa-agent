# MA-259: Claude Design against the repo mirror, 28 Oct 2026

Compared at 13:05 GMT: every file of the three projects under `claude_design` in
`docs/trace.json`, listed live through the claude-design connector (`list_files`, depth
-1), against `docs/design/claude-design.json` and the copies on disk. An etag is
microseconds since 1970, so it dates the last write.

| Project | Files in Claude Design | Recorded | On disk |
| --- | --- | --- | --- |
| MyPaisa iOS v1 (`ios-v1/`) | 26, of which `.thumbnail` is not copied | 25 | 25 |
| MyPaisa DS v1 (`ds-v1/`) | 22, of which `.thumbnail` is not copied | 16 | 16 |
| MyPaisa app v1 (`app-v1/`) | 43, of which `.thumbnail` is not copied | 42 | 42 |

## What differed

| Side | File | What | Since |
| --- | --- | --- | --- |
| Changed in Claude Design | `app-v1/support.js` | etag 1792792724565889 to 1793190359680276, 66,404 to 69,150 bytes. Claude Design's own canvas runtime, rewritten when the project was opened; the new code handles slide decks (`deck-stage`). No board changed. The iOS and DS projects keep the 66,404-byte runtime | 28 Oct 2026, 12:25 UTC |
| New in Claude Design | `ds-v1/_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/` `_adherence.oxlintrc.json`, `_ds_bundle.js`, `_ds_manifest.json`, `readme.md`, `styles.css` (4,002, 303, 7,247, 7,376 and 10,555 bytes) | The design system Claude Design attaches to a project. Never copied for DS v1, though the schema copies every file but the thumbnail; byte for byte the same as the copies already in `ios-v1/` and `app-v1/` | 26 Oct 2026, 14:12 UTC |
| Not copied, by rule | `.thumbnail` in each project | Claude Design's preview image (the trace schema leaves it out) | |

Nothing was gone from Claude Design, nothing on disk differed from its record
(`python3 scripts/plan_sync.py check`: 0 drift), and no `.dc.html` board changed on
either side, so no trace row's boards changed.

## After the sync

`python3 scripts/design_sync.py pull` copied the six files byte for byte (each
one's decoded length checked against the listed size, and its etag against the
listing) and recorded them:

```
copied docs/design/app-v1/support.js: etag 1792792724565889 -> 1793190359680276, 66404 -> 69150 bytes
copied docs/design/ds-v1/_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/_adherence.oxlintrc.json: new, 4002 bytes
copied docs/design/ds-v1/_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/_ds_bundle.js: new, 303 bytes
copied docs/design/ds-v1/_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/_ds_manifest.json: new, 7247 bytes
copied docs/design/ds-v1/_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/readme.md: new, 7376 bytes
copied docs/design/ds-v1/_ds/modernist-2eec665c-e41e-41b4-81e4-695e924185f5/styles.css: new, 10555 bytes
pull: 6 copied, 0 dropped
design-sync: 3 projects, 88 files in Claude Design, 0 drift
```

`claude-design.json` now lists each project's files in name order (DS v1's were in the
order they were first copied).
