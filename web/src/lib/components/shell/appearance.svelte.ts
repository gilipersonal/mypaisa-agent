/** The appearance in force (MA-358, Web v4 · Header controls): System, Light or Dark, one setting the header's pill and
 * the palette both change, kept in this browser through appearance.ts. The shell provides it and applies its value to
 * the document. */
import { getContext, setContext } from 'svelte';
import type { KeyValue } from '#lib/chat/outbox.ts';
import { readAppearance, saveAppearance } from './appearance.ts';
import type { Appearance } from './palette.ts';

export class AppearanceSetting {
	value = $state<Appearance>('system');

	constructor(private readonly store?: KeyValue) {
		this.value = readAppearance(store);
	}

	set(next: Appearance): void {
		this.value = next;
		saveAppearance(this.store, next);
	}
}

const KEY = Symbol('mp.appearance');

export function provideAppearance(setting: AppearanceSetting): AppearanceSetting {
	setContext(KEY, setting);
	return setting;
}

export function useAppearance(): AppearanceSetting {
	const setting = getContext<AppearanceSetting | undefined>(KEY);
	if (!setting) throw new Error('the appearance is used outside the shell that provides it');
	return setting;
}
