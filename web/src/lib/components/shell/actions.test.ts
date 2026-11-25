import { describe, expect, it } from 'vitest';
import { provideShell, useShell } from './actions.ts';

describe('the shell’s actions', () => {
	it('are provided only inside the shell', () => {
		expect(() => useShell()).toThrow();
		expect(() => {
			provideShell({ openChat: () => undefined, attachFile: () => undefined });
		}).toThrow();
	});
});
