/** The wealth source the shell provides and every wealth page reads through its queries. */
import { getContext, setContext } from 'svelte';
import type { WealthSource } from '#lib/api/wealth.ts';

const KEY = Symbol('mp.wealth');

export function provideWealth(source: WealthSource): void {
	setContext(KEY, source);
}

export function useWealth(): WealthSource {
	const source = getContext<WealthSource | undefined>(KEY);
	if (!source) throw new Error('a wealth page is used outside the shell that provides its source');
	return source;
}
