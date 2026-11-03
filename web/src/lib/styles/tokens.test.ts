import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const ds = (p: string) => here(`../../../../docs/design/ds-v1/${p}`);
const FONTS = /^@import url\("https:\/\/fonts\.googleapis\.com[^\n]*\n/m;

describe('the web app uses DS v1 as drawn', () => {
	it('tokens.css is DS v1 tokens.css, but for the font import app.html makes', () => {
		expect(here('./tokens.css')).toBe(ds('tokens.css').replace(FONTS, ''));
	});

	it('motion.css is DS v1 motion.css', () => {
		expect(here('./motion.css')).toBe(ds('motion.css'));
	});
});
