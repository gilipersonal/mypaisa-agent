import { describe, expect, it } from 'vitest';
import { canRender, isCardEnvelope } from './types';

const card = { type: 'confirm', version: 1, id: 'c-1', fallback: 'Add ISA: £20,000. Confirm?', body: {} };

describe('the card envelope', () => {
	it('accepts a whole envelope', () => {
		expect(isCardEnvelope(card)).toBe(true);
	});

	it('refuses anything missing a field or of the wrong shape', () => {
		expect(isCardEnvelope(null)).toBe(false);
		expect(isCardEnvelope('card')).toBe(false);
		expect(isCardEnvelope({ ...card, version: 1.5 })).toBe(false);
		const { fallback: _dropped, ...noFallback } = card;
		expect(isCardEnvelope(noFallback)).toBe(false);
	});

	it('draws only the versions this door knows', () => {
		expect(canRender(card)).toBe(true);
		expect(canRender({ ...card, version: 2 })).toBe(false);
	});
});
