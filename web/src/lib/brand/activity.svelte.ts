/** The mark in motion (MA-360; MA-355 d 1a, board DS v1 · Mark in motion): the sidebar's mark arrives once as the app
 * opens, runs one lap when MyPaisa starts on a message, and rings once when a change is saved. It is still otherwise.
 *
 * The board's rule, kept here: one reaction at a time. A lap asked for while one plays is not restarted and not
 * queued; a save that lands while one plays rings when it ends (only a save is held, and only one); nothing plays while
 * the tab is hidden, and nothing plays when it comes back. Under Reduce Motion each moment is its still version, a
 * cross-fade in place. */
import type { QueryClient } from '@tanstack/query-core';
import { useQueryClient } from '@tanstack/svelte-query';
import { useChat, type ChatSession } from '#lib/chat/session.svelte.ts';

export type Scene = 'open' | 'lap' | 'saved';

/** How long each moment plays (the board's "Lasts"), and its Reduce Motion version: a 150 ms fade each way. */
export const LASTS: Readonly<Record<Scene, number>> = { open: 1120, lap: 1200, saved: 600 };
export const STILL_LASTS = 450;
/** A held ring starts this long after the reaction before it ends, as the board's rules stage does. */
const HOLD_GAP = 30;

/** What the player needs from the window; a test passes its own. */
export interface MarkEnv {
	now(): number;
	later(fn: () => void, ms: number): () => void;
	hidden(): boolean;
	reduced(): boolean;
}

export function browserEnv(): MarkEnv {
	return {
		now: () => Date.now(),
		later: (fn, ms) => {
			const t = setTimeout(fn, ms);
			return () => {
				clearTimeout(t);
			};
		},
		hidden: () => document.hidden,
		reduced: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
	};
}

/** What became of an ask: it plays, it waits for the one playing, or nothing happens. */
export type Outcome = 'played' | 'held' | 'dropped' | 'hidden';

/** Plays one moment at a time. `scene` is what the mark draws (undefined: at rest); `run` counts the moments played,
 * so the mark can start each one afresh; `still` says the moment is its Reduce Motion version. */
export class MarkPlayer {
	scene = $state<Scene | undefined>();
	still = $state(false);
	run = $state(0);

	#until = 0;
	#runs = 0;
	#held: (() => void) | undefined;
	#rest: (() => void) | undefined;

	constructor(private readonly env: MarkEnv) {}

	ask(scene: Scene): Outcome {
		if (this.env.hidden()) return 'hidden';
		if (this.env.now() < this.#until) {
			if (scene !== 'saved' || this.#held) return 'dropped';
			this.#held = this.env.later(
				() => {
					this.#held = undefined;
					this.#start('saved');
				},
				this.#until - this.env.now() + HOLD_GAP
			);
			return 'held';
		}
		this.#start(scene);
		return 'played';
	}

	/** Cancels what waits and leaves the mark at rest. */
	stop(): void {
		this.#held?.();
		this.#held = undefined;
		this.#rest?.();
		this.#rest = undefined;
		this.#until = 0;
		this.scene = undefined;
	}

	#start(scene: Scene): void {
		// A held ring whose time comes while the tab is hidden is skipped, as any other ask would be.
		if (this.env.hidden()) return;
		const still = this.env.reduced();
		const lasts = still ? STILL_LASTS : LASTS[scene];
		this.#rest?.();
		this.still = still;
		this.scene = scene;
		// Written, never read here: a component's effect that asks for a moment does not come to depend on it.
		this.#runs += 1;
		this.run = this.#runs;
		this.#until = this.env.now() + lasts;
		this.#rest = this.env.later(() => {
			this.#rest = undefined;
			this.scene = undefined;
		}, lasts);
	}
}

/** The arrival plays once per load: not on moving between pages, and not when the tab comes back. */
let arrived = false;

export function arriveOnce(): boolean {
	if (arrived) return false;
	arrived = true;
	return true;
}

/** For tests only: a new load. */
export function newLoad(): void {
	arrived = false;
}

export { onRing, ringMark } from './watch.ts';

/** What a live mark reads from the shell: the chat and the query client. Outside the shell (a test, a page with no
 * chat) there is neither, and the mark stays still. Called while a component is set up. */
export function liveContext(): { chat: ChatSession; queries: QueryClient } | undefined {
	try {
		return { chat: useChat(), queries: useQueryClient() };
	} catch {
		return undefined;
	}
}
