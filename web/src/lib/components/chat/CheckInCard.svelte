<script lang="ts">
	// The check-in card, 1b (MA-205; board Web v4 · Check-ins): the question, exactly what Paid saves, Paid as the one
	// filled button and Something else for the rest, opened in place under the buttons. Answered, it edits in place to
	// its check, what was saved and Undo; a step of a short flow folds to its line as the next question rises. In privacy
	// mode every amount is masked until "Show amounts on this card" reveals this card only (iPhone v4 · Check-ins, K11).
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import Eye from '@lucide/svelte/icons/eye';
	import History from '@lucide/svelte/icons/history';
	import Undo2 from '@lucide/svelte/icons/undo-2';
	import type { CheckInAction, CheckInCard } from '#lib/cards/checkin.ts';
	import { timeOf } from '#lib/chat/days.ts';
	import type { CardAction } from '#lib/chat/transport.ts';
	import { maskAmounts } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';

	let {
		card,
		privacy = false,
		onTap
	}: { card: CheckInCard; privacy?: boolean; onTap: (action: CardAction) => void } = $props();
	const body = $derived(card.body);
	let open = $state(false);
	let shown = $state(false);
	const masked = $derived(privacy && !shown);
	const m = (text: string) => maskAmounts(text, masked);
	const at = (iso: string) => timeOf(new Date(iso));
	const hasAmounts = $derived(
		/[£₹$€]\s?\d/.test(
			[body.title, body.text, ...(body.rows ?? []).map((r) => r.value), ...(body.items ?? []).map((i) => i.value)]
				.filter(Boolean)
				.join(' ')
		)
	);

	function tap(action: CheckInAction | { id: string }) {
		open = false;
		onTap(action.id as CardAction);
	}
</script>

{#snippet button(a: CheckInAction, extra = '')}
	<button
		type="button"
		class="mp-btn mp-btn-small mp-btn-{a.style} {extra}"
		data-testid={a.style === 'primary'
			? TestIDs.chatCheckInConfirm
			: a.icon === 'undo'
				? TestIDs.chatCheckInUndo
				: undefined}
		onclick={() => {
			tap(a);
		}}
	>
		{#if a.icon === 'undo'}<Undo2 class="lc" aria-hidden="true" />{/if}{m(a.label)}
	</button>
{/snippet}

<div class="cc" role="group" aria-label={m(body.title ?? body.over ?? card.fallback)} data-testid={TestIDs.chatCheckIn}>
	<div class="cc-h">
		<div class="ci-top">
			{#if body.chip}
				<span class="mp-chip mp-neutral"><CalendarCheck class="lc" aria-hidden="true" />{body.chip}</span>
			{:else if body.over}
				<span class="mp-over mp-ink2">{body.over}</span>
			{/if}
			{#if body.right}
				<span class="mp-foot mp-ink2">{body.right}{body.right_at ? ` ${at(body.right_at)}` : ''}</span>
			{/if}
			{#if body.cancel}
				<button
					type="button"
					class="mp-btn mp-btn-plain mp-btn-small"
					onclick={() => {
						tap({ id: 'checkin.cancel' });
					}}
				>
					{body.cancel}
				</button>
			{/if}
		</div>
		{#if body.title}
			<span class="flex items-center gap-2">
				{#if body.saved}<CircleCheck class="lc okk" aria-hidden="true" />{/if}
				<span class="mp-hl">{m(body.title)}</span>
			</span>
		{/if}
	</div>
	<div class="cc-b">
		{#if privacy && hasAmounts}
			<div class="ci-reveal" class:col={!shown}>
				{#if shown}
					<span class="flex items-center gap-1.5">
						<Eye class="lc" aria-hidden="true" />Privacy is on: amounts shown on this card only
					</span>
					<button
						type="button"
						class="ci-fref"
						onclick={() => {
							shown = false;
						}}
					>
						Hide
					</button>
				{:else}
					<span>Privacy is on: amounts hidden.</span>
					<button
						type="button"
						class="ci-fref"
						onclick={() => {
							shown = true;
						}}
					>
						<Eye class="lc" aria-hidden="true" />Show amounts on this card
					</button>
				{/if}
			</div>
		{/if}
		{#each body.answers ?? [] as a (a.label)}
			<div class="ci-dn">
				<span>{a.label}</span>
				<span class="flex items-center gap-1.5"><b>{m(a.value)}</b><Check class="lc" aria-hidden="true" /></span>
			</div>
		{/each}
		{#if body.text}<span class="ci-t">{m(body.text)}</span>{/if}
		{#if body.picks}
			<div class="ci-pick">
				{#each body.picks as p, i (p.id)}
					{@render button(p, i === 0 ? 'full' : '')}
				{/each}
			</div>
		{/if}
		{#each body.rows ?? [] as row (row.label)}
			<div class="kvr"><span>{row.label}</span><span>{m(row.value)}</span></div>
		{/each}
		{#each body.items ?? [] as it (it.name)}
			<div class="ci-row">
				<span class="ci-tile" aria-hidden="true">{it.tile}</span>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="ci-nm">{it.name}</span>
					<span class="ci-sub">{it.note}</span>
				</span>
				<span class="ci-v">
					<span class="ci-nm">{m(it.value)}</span>
					{#if it.chip}<span class="mp-chip mp-pause chip-s">{it.chip}</span>{/if}
				</span>
				{#if it.done}<Check class="ci-chk" aria-label="Saved" />{/if}
			</div>
		{/each}
		{#if body.undone}
			<div class="ci-undone">
				<Undo2 class="lc" aria-hidden="true" /><span>Undone at {at(body.undone.at)}. {body.undone.text}</span>
			</div>
		{/if}
		{#if body.hint}<span class="mp-foot mp-ink2 cc-hint">{body.hint}</span>{/if}
	</div>
	{#if (body.actions?.length ?? 0) + (body.options?.length ?? 0) > 0}
		<div class="cc-a ci-a">
			{#each body.actions ?? [] as a (a.id)}
				{@render button(a)}
			{/each}
			{#if body.options?.length}
				<button
					type="button"
					class="mp-btn mp-btn-small mp-btn-tinted"
					class:sel={open}
					aria-expanded={open}
					data-testid={TestIDs.chatCheckInMore}
					onclick={() => {
						open = !open;
					}}
				>
					Something else{#if open}<ChevronUp class="lc" aria-hidden="true" />{:else}<ChevronDown
							class="lc"
							aria-hidden="true"
						/>{/if}
				</button>
			{/if}
		</div>
	{/if}
	{#if open && body.options}
		<div class="ci-opts">
			{#each body.options as o (o.id)}
				<button
					type="button"
					class="ci-opt"
					onclick={() => {
						tap(o);
					}}
				>
					<span class="flex flex-1 flex-col">
						<span class="ci-nm">{m(o.label)}</span>
						<span class="ci-sub">{m(o.note)}</span>
					</span>
					<ChevronRight class="chev" aria-hidden="true" />
				</button>
			{/each}
		</div>
	{/if}
	{#if body.fold}
		<div class="cc-f">
			<span class="flex items-center gap-2">
				{#if body.fold.icon === 'saved'}<History class="lc" aria-hidden="true" />{:else}<Clock
						class="lc"
						aria-hidden="true"
					/>{/if}{body.fold.text}
			</span>
			<span>{at(body.fold.at)}</span>
		</div>
	{/if}
</div>
