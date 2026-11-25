<script lang="ts">
	// The chat (MA-199, MA-357): its head, the offline and back-online line, the conversation, the suggestions and the
	// composer. From 1024 px it is the sheet over the page (Web v4 · Chat sheet, MA-355 a 1a): a grabber and "Chat" at its
	// top, Close and New conversation at the right. Under 1024 px it is the Chat tab, whose head the tab bar stands in
	// for. The shell decides which, by the window's width, and keeps one panel for both, so a half-typed message, the
	// scroll position and the conversation stay as they were.
	import { createQuery } from '@tanstack/svelte-query';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import CloudCheck from '@lucide/svelte/icons/cloud-check';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import FileUp from '@lucide/svelte/icons/file-up';
	import SquarePen from '@lucide/svelte/icons/square-pen';
	import X from '@lucide/svelte/icons/x';
	import { chatTimelineQuery } from '#lib/api/queries.ts';
	import { useChat } from '#lib/chat/session.svelte.ts';
	import { activeTurn, type ChatMessage } from '#lib/chat/timeline.ts';
	import type { CardAction } from '#lib/chat/transport.ts';
	import Composer from './Composer.svelte';
	import Timeline from './Timeline.svelte';
	import { holdsOffline } from './thread.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { hideAmounts } from '#lib/privacy/mask.ts';

	let {
		place,
		context,
		admin = true,
		titleId,
		onClose,
		onNew,
		onPull,
		onLetGo,
		field = $bindable(),
		picker = $bindable()
	}: {
		/** The sheet over the page (from 1024 px), or the Chat tab under it. */
		place: 'sheet' | 'tab';
		/** The page the chat sits over, for the composer's prompt: "Ask about Home". */
		context: string | undefined;
		/** A member who is not an admin is offered no Add and no statement (board: a member who is not an admin). */
		admin?: boolean;
		/** The id the sheet's dialog is labelled by. */
		titleId: string;
		onClose: () => void;
		/** New conversation: an empty thread. */
		onNew: () => void;
		/** The grabber is pulled `dy` px down. */
		onPull: (dy: number) => void;
		/** The grabber is let go after a pull of `dy` px that took `ms`. */
		onLetGo: (dy: number, ms: number) => void;
		field?: HTMLTextAreaElement | undefined;
		/** The composer's file input, so the palette's Send a statement can open it. */
		picker?: HTMLInputElement | undefined;
	} = $props();

	const chat = useChat();
	const timeline = createQuery(() => chatTimelineQuery());
	const messages: readonly ChatMessage[] = $derived(timeline.data?.messages ?? []);
	const streaming = $derived(timeline.data ? activeTurn(timeline.data) !== undefined : false);
	const busy = $derived(messages.some((m) => m.role === 'agent' && m.phase !== 'done'));
	const empty = $derived(timeline.isSuccess && messages.length === 0);
	let text = $state('');
	/** A Confirm tapped offline: held, nothing saved, until the connection is back. */
	let held = $state(false);

	$effect(() => {
		if (chat.online) held = false;
	});

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

	const privacy = usePrivacy();

	// The newest finished reply, for screen readers: the streaming words are not read one by one.
	const said = $derived.by(() => {
		const last = messages.findLast((m) => m.role === 'agent' && m.phase === 'done');
		if (!last) return '';
		const words = [last.text, ...(last.cards ?? []).map((c) => c.fallback)].filter(Boolean).join(' ');
		return hideAmounts(words, privacy.on);
	});

	// The grabber: pulled down, the sheet follows; let go far or fast enough, it closes; a click closes it too.
	let pull: { id: number; y: number; t: number; dy: number } | undefined;

	function grab(event: PointerEvent) {
		if (event.button !== 0) return;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		pull = { id: event.pointerId, y: event.clientY, t: event.timeStamp, dy: 0 };
	}

	function drag(event: PointerEvent) {
		if (pull?.id !== event.pointerId) return;
		pull.dy = event.clientY - pull.y;
		onPull(pull.dy);
	}

	function letGo(event: PointerEvent) {
		if (pull?.id !== event.pointerId) return;
		const { dy, t } = pull;
		pull = undefined;
		if (Math.abs(dy) < 4) onClose();
		else onLetGo(dy, event.timeStamp - t);
	}

	function cancelPull(event: PointerEvent) {
		if (pull?.id !== event.pointerId) return;
		pull = undefined;
		onLetGo(0, 0);
	}
</script>

{#if place === 'sheet'}
	<!-- The grabber is for the pointer only (the board's note): the keyboard has Close and Esc. -->
	<span
		class="grabb"
		aria-hidden="true"
		title="Pull down to close"
		onpointerdown={grab}
		onpointermove={drag}
		onpointerup={letGo}
		onpointercancel={cancelPull}
	>
		<i class="grab"></i>
	</span>
	<div class="csh">
		<h2 id={titleId} class="mp-hl">Chat</h2>
		<!-- Close is first in the markup, the trap's first stop, and drawn last, at the right. -->
		<span class="csh-a">
			<button type="button" class="iconbtn rnd" aria-label="Close the chat" onclick={onClose}>
				<X class="lc" aria-hidden="true" />
			</button>
			<button type="button" class="iconbtn rnd" aria-label="New conversation" onclick={onNew}>
				<SquarePen class="lc" aria-hidden="true" />
			</button>
		</span>
	</div>
{/if}

<div aria-live="polite">
	{#if !chat.online}
		<div class="ban ban-off">
			<CloudOff class="lc lc-s" aria-hidden="true" /><span>
				{#if held}
					Confirm needs the connection, so nothing was saved. The card stays open: tap Confirm again when you're back.
				{:else}
					You're offline. What you type waits here and sends by itself when you're back.
				{/if}
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

{#if empty && place === 'sheet'}
	<div class="cempty">
		<span class="mp-hl">New conversation</span>
		<p class="mp-foot mp-ink2">
			{context ? `Ask about ${context}, or` : 'Ask about the household’s money, or'} tell MyPaisa something new. Anything
			you add is shown as a card to confirm.
		</p>
	</div>
{:else}
	<Timeline
		{messages}
		onChoose={(id: string, chip: string) => void chat.choose(id, chip)}
		onTap={(card: string, action: CardAction) => {
			// MA-205: "Type HDFC's figure" puts the caret in the composer, where the amount is typed.
			if (action === 'checkin.type') field?.focus();
			if (holdsOffline(action, chat.online)) {
				held = true;
				return;
			}
			void chat.tap(card, action);
		}}
	/>
{/if}
<p class="sr-only" aria-live="polite">{said}</p>

{#if suggest}
	<div class="sugg" role="group" aria-label="Suggestions">
		<button type="button" class="sg" onclick={() => void chat.send("What's our net worth?")}>
			<ChartPie class="lc" aria-hidden="true" />Net worth
		</button>
		<button type="button" class="sg" onclick={() => void chat.send("What's due this week?")}>
			<CalendarIcon class="lc" aria-hidden="true" />What's due
		</button>
		{#if admin}
			<button type="button" class="sg" onclick={() => field?.focus()}>
				<CirclePlus class="lc" aria-hidden="true" />Add anything
			</button>
			<button type="button" class="sg" onclick={() => picker?.click()}>
				<FileUp class="lc" aria-hidden="true" />Send a statement
			</button>
		{/if}
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
