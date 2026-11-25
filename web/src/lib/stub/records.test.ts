import { describe, expect, it } from 'vitest';
import { monzoSavings } from './records.ts';

describe('the record the scripted chat adds', () => {
	it('is a liquid savings account in pounds, owned as the chat was told', () => {
		expect(monzoSavings('5000', 'arun')).toMatchObject({ value: 5000, ccy: 'GBP', liquidity: 'liquid' });
		expect(monzoSavings('5000', 'asha').owners).toEqual([['asha', 100]]);
		expect(monzoSavings('1250.50', 'joint')).toMatchObject({
			value: 1250.5,
			owners: [
				['arun', 50],
				['asha', 50]
			]
		});
		expect(monzoSavings('5000', 'someone').owners).toEqual([['arun', 100]]);
	});
});
