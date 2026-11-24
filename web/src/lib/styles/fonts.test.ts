import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The fonts are the app's own (MA-340, MA-301 f 1a): scripts/fonts.py writes the same files into web/static/fonts/ and
// docs/design/ds-v1/, with a fonts.css beside each, from the Fontsource packages in the web catalog. Nothing is fetched
// from Google, at the web app or on the boards.
const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const text = (p: string) => readFileSync(path(p), 'utf8');
const bytes = (p: string) => readFileSync(path(p));
const STATIC = '../../../static/fonts/';
const DS = '../../../../docs/design/ds-v1/';
const MODULES = '../../../node_modules/';
const GOOGLE = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

const served = readdirSync(path(STATIC)).filter((f) => f.endsWith('.woff2'));

describe('the self-hosted fonts', () => {
	it('serves Inter and the Nunito figures, and nothing else', () => {
		expect(served.sort()).toEqual([
			'inter-latin-ext-wght-normal.woff2',
			'inter-latin-wght-normal.woff2',
			'nunito-figures-latin-800.woff2',
			'nunito-figures-rupee-800.woff2'
		]);
	});

	it('serves Fontsource’s own Inter files', () => {
		for (const f of served.filter((n) => n.startsWith('inter-'))) {
			expect(bytes(STATIC + f).equals(bytes(`${MODULES}@fontsource-variable/inter/files/${f}`))).toBe(true);
		}
	});

	it('keeps the Nunito figures small', () => {
		for (const f of served.filter((n) => n.startsWith('nunito-'))) {
			expect(bytes(STATIC + f).length).toBeLessThan(8 * 1024);
		}
	});

	it('gives the boards the same files', () => {
		for (const f of served) expect(bytes(STATIC + f).equals(bytes(DS + f))).toBe(true);
	});

	it('declares the same faces for the app (at /fonts/) and the boards (beside fonts.css)', () => {
		const app = text('./fonts.css');
		expect(app).toContain('url("/fonts/inter-latin-wght-normal.woff2")');
		expect(app.replaceAll('url("/fonts/', 'url("')).toBe(text(`${DS}fonts.css`));
		for (const f of served) expect(app).toContain(`url("/fonts/${f}")`);
	});

	it('preloads the Latin Inter and the figures from the app’s own origin, never from Google', () => {
		const html = text('../../app.html');
		expect(html).not.toMatch(GOOGLE);
		const preloads = [...html.matchAll(/href="%sveltekit\.assets%\/fonts\/([^"]+)"\s+as="font"/g)].map((m) => m[1]);
		expect(preloads).toEqual(['inter-latin-wght-normal.woff2', 'nunito-figures-latin-800.woff2']);
		for (const f of preloads) expect(served).toContain(f);
	});

	it('leaves no Google Fonts and no Material Symbols in the shared styles', () => {
		for (const f of ['./tokens.css', './fonts.css', `${DS}tokens.css`, `${DS}ios.css`, `${DS}fonts.css`]) {
			const css = text(f);
			expect(css).not.toMatch(GOOGLE);
			expect(css).not.toMatch(/Material Symbols|\.ms\b/);
		}
	});
});
