<script lang="ts">
	// The chat column (MA-199, Web v4 · Shell and chat): its head, the offline and back-online line, the conversation, the
	// suggestions and the composer. The same panel sits beside the page, opens as a drawer, or is the Chat tab; the shell
	// decides which, by the window's width.
	import { createQuery } from '@tanstack/svelte-query';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import FileUp from '@lucide/svelte/icons/file-up';
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import X from '@lucide/svelte/icons/x';
	import { chatTimelineQuery } from '#lib/api/queries.ts';
	import { useChat } from '#lib/chat/session.svelte.ts';
	import { activeTurn, type ChatMessage } from '#lib/chat/timeline.ts';
	import type { CardAction } from '#lib/chat/transport.ts';
	import Composer from './Composer.svelte';
	import Timeline from './Timeline.svelte';

	let {
		mode,
		context,
		onClose,
		field = $bindable(),
		picker = $bindable()
	}: {
		/** Beside the page (its button hides it) or a drawer (its button closes it). */
		mode: 'beside' | 'drawer';
		/** The page the chat sits by, for the composer's prompt: "Ask about Home". */
		context: string | undefined;
		onClose: () => void;
		field?: HTMLTextAreaElement | undefined;
		/** The composer's file input, so the palette's Send a statement can open it. */
		picker?: HTMLInputElement | undefined;
	} = $props();

	const chat = useChat();
	const timeline = createQuery(() => chatTimelineQuery());
	const messages: readonly ChatMessage[] = $derived(timeline.data?.messages ?? []);
	const streaming = $derived(timeline.data ? activeTurn(timeline.data) !== undefined : false);
	const busy = $derived(messages.some((m) => m.role === 'agent' && m.phase !== 'done'));
	let text = $state('');

	const placeholder = $derived(
		!chat.online
			? 'Offline · what you type waits here'
			: streaming
				? 'MyPaisa is writing…'
				: context
					? `Ask about ${context}, or tell MyPaisa something new`
					: 'Ask MyPaisa, or tell it something new'
	);
	const suggest = $derived(chat.online && !busy && !chat.attachment && !chat.back && text.trim() === '');

	// The newest finished reply, for screen readers: the streaming words are not read one by one.
	const said = $derived.by(() => {
		const last = messages.findLast((m) => m.role === 'agent' && m.phase === 'done');
		if (!last) return '';
		return [last.text, ...(last.cards ?? []).map((c) => c.fallback)].filter(Boolean).join(' ');
	});
</script>

<div class="chd">
	<div class="flex flex-col">
		<span class="mp-hl">Chat</span>
		<span class="mp-foot mp-ink2">One conversation at every door</span>
	</div>
	{#if mode === 'drawer'}
		<button type="button" class="iconbtn" aria-label="Close the chat" onclick={onClose}>
			<X class="lc" aria-hidden="true" />
		</button>
	{:else}
		<button type="button" class="iconbtn" aria-label="Hide the chat" onclick={onClose}>
			<PanelRightClose class="lc" aria-hidden="true" />
		</button>
	{/if}
</div>

<div aria-live="polite">
	{#if !chat.online}
		<div class="ban ban-off">
			<CloudOff class="lc lc-s" aria-hidden="true" /><span>
				You're offline. What you type waits here and sends by itself when you're back.
			</span>
		</div>
	{:else if chat.back}
		<div class="ban ban-back">
			<CloudCheck class="lc lc-s" aria-hidden="true" /><span>
				Back online at {chat.back.at} · {chat.back.sent} message{chat.back.sent === 1 ? '' : 's'} sent
			</span>
		</div>
	{/if}
</div>

<Timeline
	{messages}
	onChoose={(id: string, chip: string) => void chat.choose(id, chip)}
	onTap={(card: string, action: CardAction) => void chat.tap(card, action)}
/>
<p class="sr-only" aria-live="polite">{said}</p>

{#if suggest}
	<div class="sugg" role="group" aria-label="Suggestions">
		<button type="button" class="sg" onclick={() => void chat.send("What's our net worth?")}>
			<ChartPie class="lc" aria-hidden="true" />Net worth
		</button>
		<button type="button" class="sg" onclick={() => void chat.send("What's due this week?")}>
			<CalendarIcon class="lc" aria-hidden="true" />What's due
		</button>
		<button type="button" class="sg" onclick={() => field?.focus()}>
			<CirclePlus class="lc" aria-hidden="true" />Add anything
		</button>
		<button type="button" class="sg" onclick={() => picker?.click()}>
			<FileUp class="lc" aria-hidden="true" />Send a statement
		</button>
	</div>
{/if}

<Composer
	{placeholder}
	{streaming}
	bind:attachment={chat.attachment}
	bind:text
	bind:field
	bind:picker
	onSend={(t: string) => void chat.send(t)}
	onStop={() => void chat.stop()}
/>
