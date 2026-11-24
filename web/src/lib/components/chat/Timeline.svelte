<script lang="ts">
	// The conversation, newest at the bottom (MA-199, MA-229): rows are drawn through TanStack Virtual, so a long history
	// costs only what is on screen, and each row is measured as it grows while a reply streams. A short conversation sits
	// at the bottom of the column, as the boards draw it. The view follows new words while the member is at the bottom,
	// and leaves them where they are once they have scrolled up to read.
	import {
		Virtualizer,
		elementScroll,
		measureElement,
		observeElementOffset,
		observeElementRect
	} from '@tanstack/virtual-core';
	import { onMount, untrack } from 'svelte';
	import { rowsOf, type Row } from '#lib/chat/days.ts';
	import type { ChatMessage } from '#lib/chat/timeline.ts';
	import type { CardAction } from '#lib/chat/transport.ts';
	import Message from './Message.svelte';

	let {
		messages,
		onChoose,
		onTap
	}: {
		messages: readonly ChatMessage[];
		onChoose: (messageId: string, chipId: string) => void;
		onTap: (cardId: string, action: CardAction) => void;
	} = $props();

	const rows: Row[] = $derived(rowsOf(messages, new Date()));
	let scroller: HTMLDivElement | undefined = $state();
	let tick = $state(0);
	let follow = true;

	const virtualizer = new Virtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => scroller ?? null,
		estimateSize: () => 64,
		overscan: 8,
		scrollToFn: elementScroll,
		observeElementRect,
		observeElementOffset,
		measureElement,
		onChange: () => untrack(() => (tick += 1))
	});

	// Only `rows` is tracked here: the virtualizer's own updates bump `tick` and must not re-run this.
	$effect(() => {
		const list = rows;
		untrack(() => {
			virtualizer.setOptions({
				...virtualizer.options,
				count: list.length,
				getItemKey: (i) => list[i]?.key ?? i
			});
			virtualizer._willUpdate();
			tick += 1;
		});
	});

	onMount(() => virtualizer._didMount());

	const view = $derived.by(() => {
		const _tick = tick; // the virtualizer's own state is not reactive: this re-reads it on each change
		const total = virtualizer.getTotalSize();
		const height = virtualizer.scrollRect?.height ?? 0;
		return { items: virtualizer.getVirtualItems(), total, offset: Math.max(0, height - total) };
	});

	// Keep the newest row in view while following.
	$effect(() => {
		const _total = view.total;
		if (follow && scroller) scroller.scrollTop = scroller.scrollHeight;
	});

	function onscroll() {
		if (!scroller) return;
		follow = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
	}

	function measure(node: HTMLDivElement) {
		virtualizer.measureElement(node);
	}
</script>

<div bind:this={scroller} class="msgs" role="log" aria-label="Conversation" aria-live="off" {onscroll}>
	<div class="msgs-in" style:height="{Math.max(view.total, view.total + view.offset)}px">
		{#each view.items as item (item.key)}
			{@const row = rows[item.index]}
			{#if row}
				<div
					class="msgs-row"
					data-index={item.index}
					use:measure
					style:transform="translateY({item.start + view.offset}px)"
				>
					{#if row.kind === 'day'}
						<div class="daysep">{row.label}</div>
					{:else}
						<Message
							message={row.message}
							onChoose={(chip: string) => {
								onChoose(row.message.id, chip);
							}}
							{onTap}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
</div>
