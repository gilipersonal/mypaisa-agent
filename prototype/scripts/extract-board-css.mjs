// MA-290: copies the <style> of each source board the demo reuses into src/styles/boards/, byte for byte, with a
// header naming the board and its sha256 from docs/design/claude-design.json, and records them in boards.lock.json.
// `--check` fails when a source board changed since the copy (lesson 11: a shared rule is checked where it lands).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const repo = fileURLToPath(new URL('../..', import.meta.url));
const SOURCES = [
  ['app', 'Prototype v4.dc.html', 'v4-root.css'],
  ['app', 'PrototypeV4Web.dc.html', 'v4-web.css'],
  ['app', 'PrototypeV4Phone.dc.html', 'v4-phone.css'],
  ['app', 'PrototypeV4Chat.dc.html', 'v4-chat.css'],
  ['app', 'PrototypeV4Pages.dc.html', 'v4-pages.css'],
  ['app', 'support.js', 'dc-atomics.css'],
];
const DIRS = { app: 'docs/design/app-v1', ios: 'docs/design/ios-v1', ds: 'docs/design/ds-v1' };
const record = JSON.parse(readFileSync(repo + 'docs/design/claude-design.json', 'utf8'));
const check = process.argv.includes('--check');
const lockPath = here + 'boards.lock.json';
const lock = existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
const next = {};
let bad = 0;
for (const [proj, file, out] of SOURCES) {
  const src = readFileSync(repo + DIRS[proj] + '/' + file, 'utf8');
  const sha = createHash('sha256').update(readFileSync(repo + DIRS[proj] + '/' + file)).digest('hex');
  const rec = record[proj]?.files?.[file];
  if (!rec) { console.error(`board-css: ${proj}/${file} is not in claude-design.json`); bad++; continue; }
  if (rec.sha256 !== sha) { console.error(`board-css: ${proj}/${file} differs from its record in claude-design.json`); bad++; }
  /* the Design Components runtime (support.js) carries the boards' utility classes (.fx, .jb, .gap8 ...) */
  const css = file === 'support.js'
    ? (src.match(/\.fx\{display:flex\}[^`"]*/) ?? [''])[0]
    : [...src.matchAll(/<helmet[^>]*>[\s\S]*?<\/helmet>/g)].map((m) => m[0]).flatMap((h) => [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1])).join('\n');
  if (!css.trim()) { console.error(`board-css: no <style> in ${file}`); bad++; continue; }
  next[out] = { project: proj, file, sha256: sha };
  if (check) {
    if (!lock[out] || lock[out].sha256 !== sha) { console.error(`board-css: ${file} changed since src/styles/boards/${out} was copied: run npm run boards`); bad++; }
    const have = existsSync(here + 'src/styles/boards/' + out) ? readFileSync(here + 'src/styles/boards/' + out, 'utf8') : '';
    if (!have.endsWith(css)) { console.error(`board-css: src/styles/boards/${out} is not the board's style as copied`); bad++; }
  } else {
    writeFileSync(here + 'src/styles/boards/' + out, `/* Copied from ${DIRS[proj]}/${file} (sha256 ${sha}) by scripts/extract-board-css.mjs. Never edit: change the board. */\n` + css);
  }
}
if (!check) writeFileSync(lockPath, JSON.stringify(next, null, 1) + '\n');
if (bad) process.exit(1);
console.log(check ? 'board-css: every copied style matches its board' : `board-css: copied ${Object.keys(next).length} styles`);
