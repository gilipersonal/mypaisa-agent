import { describe, expect, it } from 'vitest';
import { describeFile, kindOf, sizeOf } from './files.ts';

describe('a file in the composer', () => {
	it('reads as the boards draw it', () => {
		expect(describeFile({ name: 'barclaycard-2026-11-01.pdf', type: 'application/pdf', size: 486 * 1024 })).toEqual({
			name: 'barclaycard-2026-11-01.pdf',
			meta: 'PDF · 486 KB'
		});
	});

	it('names its kind from its type, else its extension', () => {
		expect(kindOf({ name: 'x.png', type: 'image/png' })).toBe('Image');
		expect(kindOf({ name: 'sheet.xlsx', type: '' })).toBe('XLSX');
		expect(kindOf({ name: 'noext', type: '' })).toBe('File');
	});

	it('sizes in bytes, KB or MB', () => {
		expect(sizeOf(900)).toBe('900 bytes');
		expect(sizeOf(2048)).toBe('2 KB');
		expect(sizeOf(3.5 * 1024 * 1024)).toBe('3.5 MB');
	});
});
