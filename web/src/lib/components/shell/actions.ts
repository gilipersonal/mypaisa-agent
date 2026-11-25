/** What a page may ask of the shell around it: bring the chat into view at whatever width the window is, or open the
 * file picker for it. Nothing is created on a page; these only start a conversation. */
import { getContext, setContext } from 'svelte';

export interface ShellActions {
	openChat(): void;
	attachFile(): void;
}

const KEY = Symbol('mp.shell');

export function provideShell(actions: ShellActions): void {
	setContext(KEY, actions);
}

export function useShell(): ShellActions {
	const actions = getContext<ShellActions | undefined>(KEY);
	if (!actions) throw new Error('a page is used outside the shell');
	return actions;
}
