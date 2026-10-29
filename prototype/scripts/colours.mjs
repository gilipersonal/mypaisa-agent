// MA-290: the demo adds no colour of its own (lesson 11: a colour goes into tokens.css, and its pair into
// contrast_check.py, before anything uses it). Refuses a hex, rgb(), hsl() or named colour literal in src/, except in
// the board styles copied byte for byte (src/styles/boards/) and the brand marks (src/ui/marks.ts).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP = [/src\/styles\/boards\//, /src\/ui\/marks\.ts$/];
const LIT = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![-\w])(?:white|black|red|green|blue|orange|purple|grey|gray)(?![-\w])(?=\s*[;}])/g;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const self = process.argv.includes('--selftest');
let bad = 0;
const check = (file, text) => {
  const rel = relative(root, file);
  if (SKIP.some((r) => r.test(rel))) return 0;
  let n = 0;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(LIT)) { if (!self) console.error(`colours: ${rel}:${i + 1}: a colour literal '${m[0]}'; use a DS token`); n++; }
  });
  return n;
};
if (self) {
  const cases = [['src/x.css', '.a { color: #FF0000; }', 1], ['src/x.svelte', '<b style="color: rgb(1,2,3)">', 1], ['src/x.css', '.a { color: var(--mp-ink); }', 0], ['src/styles/boards/x.css', '.a{color:#fff}', 0], ['src/x.css', '.a { background: white; }', 1]];
  for (const [f, t, want] of cases) { const got = check(join(root, f), t) > 0 ? 1 : 0; if (got !== want) { console.error(`colours selftest: ${f} '${t}' gave ${got}, expected ${want}`); bad++; } }
  if (bad) process.exit(1); console.log('colours: selftest passed'); process.exit(0);
}
for (const f of walk(join(root, 'src')).filter((f) => /\.(css|svelte|ts)$/.test(f))) bad += check(f, readFileSync(f, 'utf8'));
if (bad) process.exit(1);
console.log('colours: no colour literal outside the DS tokens');
