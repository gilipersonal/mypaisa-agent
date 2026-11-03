import { describe, expect, it } from 'vitest';
import { cn } from './utils.ts';

describe('cn', () => {
	it('lets a later class win over an earlier one of the same kind', () => {
		expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
	});

	it('drops falsy parts', () => {
		expect(cn('a', false, undefined, null, 'b')).toBe('a b');
	});
});
