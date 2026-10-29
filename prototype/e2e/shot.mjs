// Take screenshots of the demo: node e2e/shot.mjs <url> <out.png> [clicks as css selectors, '|' separated] [w] [h]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright-core'); } catch { pw = require('/Users/arundutta/projects/mypaisa-agent/scripts/node_modules/playwright-core'); }
const [url, out, clicks = '', w = '1500', h = '1050'] = process.argv.slice(2);
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.goto(url, { waitUntil: 'networkidle' });
for (const sel of clicks.split('|').filter(Boolean)) {
  if (sel.startsWith('wait:')) { await page.waitForTimeout(+sel.slice(5)); continue; }
  if (sel.startsWith('type:')) { const [f, t] = sel.slice(5).split('='); await page.fill(f, t); continue; }
  await page.locator(sel).first().click({ timeout: 5000 });
  await page.waitForTimeout(250);
}
await page.waitForTimeout(600);
await page.screenshot({ path: out });
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await browser.close();
console.log('wrote', out);
