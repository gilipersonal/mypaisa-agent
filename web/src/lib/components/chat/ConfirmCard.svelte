<script lang="ts">
	// The Confirm card (board 2b): exactly what will be written, then Confirm, Edit or Cancel. Confirm is the one filled
	// content button; Edit reopens the question it changes; Cancel leaves nothing saved. Once saved, the card edits in
	// place to "Saved · in the audit log" with the time.
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import History from '@lucide/svelte/icons/history';
	import type { ConfirmCard } from '#lib/cards/kinds.ts';
	import { timeOf } from '#lib/chat/days.ts';
	import type { CardAction } from '#lib/chat/transport.ts';

	let { card, onTap }: { card: ConfirmCard; onTap: (action: CardAction) => void } = $props();
	const body = $derived(card.body);
	const savedAt = $derived(body.saved_at ? timeOf(new Date(body.saved_at)) : '');
</script>

<div class="cc" aria-label={body.title} role="group">
	<div class="cc-h">
		<span class="mp-over mp-ink2">{body.over}</span>
		<span class="flex items-center gap-2">
			{#if body.state === 'saved'}<CircleCheck class="lc okk" aria-hidden="true" />{/if}
			<span class="mp-hl">{body.title}</span>
		</span>
	</div>
	<div class="cc-b">
		{#each body.rows as row (row.label)}
			<div class="kvr"><span>{row.label}</span><span>{row.value}</span></div>
		{/each}
		{#if body.state === 'open' && body.hint}<span class="mp-foot mp-ink2 cc-hint">{body.hint}</span>{/if}
	</div>
	{#if body.state === 'open'}
		<div class="cc-a">
			<button
				type="button"
				class="mp-btn mp-btn-primary mp-btn-small"
				onclick={() => {
					onTap('confirm');
				}}
			>
				Confirm
			</button>
			<button
				type="button"
				class="mp-btn mp-btn-tinted mp-btn-small"
				onclick={() => {
					onTap('edit');
				}}
			>
				Edit
			</button>
			<button
				type="button"
				class="mp-btn mp-btn-plain"
				onclick={() => {
					onTap('cancel');
				}}
			>
				Cancel
			</button>
		</div>
	{:else if body.state === 'saved'}
		<div class="cc-f">
			<span class="flex items-center gap-2"><History class="lc" aria-hidden="true" />Saved · in the audit log</span>
			<span>{savedAt}</span>
		</div>
	{:else}
		<div class="cc-f"><span>Cancelled · nothing was saved</span></div>
	{/if}
</div>
