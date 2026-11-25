/** What the sidebar's mark watches (MA-360): MyPaisa starting on a member's message, a save shown in the chat, a figure
 * saved in place on a page, and anything else that rings it through `ringMark()`. Plain TypeScript, so the player in
 * `./activity.svelte.ts` stays the only state the mark renders. */
import { hashKey, type MutationCache, type QueryCache, type QueryClient } from '@tanstack/query-core';
import { chatKeys } from '#lib/api/queries.ts';
import { isCheckInCard } from '#lib/cards/checkin.ts';
import { isConfirmCard } from '#lib/cards/kinds.ts';
import { isPlanCard } from '#lib/cards/plan.ts';
import { messageKey, type Timeline } from '#lib/chat/timeline.ts';

const ringers = new Set<() => void>();

/** Rings the mark once, for a change saved somewhere the mark does not watch itself. The mark already rings for a
 * Confirm that saves in the chat and for a figure saved in place (any wealth mutation that succeeds). */
export function ringMark(): void {
	for (const fn of ringers) fn();
}

export function onRing(fn: () => void): () => void {
	ringers.add(fn);
	return () => {
		ringers.delete(fn);
	};
}

/** The agent turns that answer a member's message: an agent's turn carries the id of the message it answers. A turn
 * with no member message of its own (a check-in arriving, the "Done." after a Confirm) is not MyPaisa starting on a
 * message, so it is not here. */
export function turnsAnswering(t: Timeline): string[] {
	const asked = new Set(t.messages.filter((m) => m.role === 'member').map((m) => m.id));
	return t.messages.filter((m) => m.role === 'agent' && asked.has(m.id)).map(messageKey);
}

/** Every save the conversation shows: a Confirm card saved, a plan card added to the plan, a check-in answered with a
 * save, and each of a check-in's rows ticked once saved. */
export function savesShown(t: Timeline): string[] {
	const out: string[] = [];
	for (const m of t.messages) {
		for (const card of m.cards ?? []) {
			if (isConfirmCard(card)) {
				if (card.body.state === 'saved') out.push(card.id);
			} else if (isPlanCard(card)) {
				if (card.body.done === true) out.push(card.id);
			} else if (isCheckInCard(card)) {
				if (card.body.saved === true || card.body.fold?.icon === 'saved') out.push(card.id);
				card.body.items?.forEach((item, i) => {
					if (item.done === true) out.push(`${card.id}#${String(i)}`);
				});
			}
		}
	}
	return out;
}

/** What the conversation asks of the mark as it changes. Whatever it showed when the watch began, and whatever it has
 * shown since, never asks twice (a resync that fills the conversation again asks nothing). */
export class ChatWatch {
	#turns: Set<string>;
	#saves: Set<string>;

	constructor(start: Timeline) {
		this.#turns = new Set(turnsAnswering(start));
		this.#saves = new Set(savesShown(start));
	}

	next(t: Timeline): { lap: boolean; saved: boolean } {
		return { lap: this.#fresh(this.#turns, turnsAnswering(t)), saved: this.#fresh(this.#saves, savesShown(t)) };
	}

	#fresh(seen: Set<string>, now: string[]): boolean {
		let fresh = false;
		for (const k of now) {
			if (!seen.has(k)) {
				seen.add(k);
				fresh = true;
			}
		}
		return fresh;
	}
}

export interface Reactions {
	lap(): void;
	saved(): void;
}

const timelineHash = hashKey(chatKeys.timeline);

/** Watches the chat's conversation in the query cache (laps and saves in the chat) and the wealth mutations (a figure
 * saved in place on a page). Returns a stop. */
export function watchActivity(queries: QueryClient, read: () => Timeline, on: Reactions): () => void {
	const watch = new ChatWatch(read());
	const cache: QueryCache = queries.getQueryCache();
	const mutations: MutationCache = queries.getMutationCache();
	const stopQueries = cache.subscribe((event) => {
		if (event.type !== 'updated' || event.query.queryHash !== timelineHash) return;
		const { lap, saved } = watch.next(read());
		if (lap) on.lap();
		if (saved) on.saved();
	});
	const stopMutations = mutations.subscribe((event) => {
		if (event.type !== 'updated' || event.action.type !== 'success') return;
		if (event.mutation.options.mutationKey?.[0] === 'wealth') on.saved();
	});
	return () => {
		stopQueries();
		stopMutations();
	};
}
