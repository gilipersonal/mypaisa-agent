<script lang="ts">
	// What we own and owe (MA-359; board Web v4 · Home charts, MA-355 c 1a): one double ring, what is owned by kind
	// outside and what is owed by loan inside on the same scale, with its two lists as its legend, its table and its
	// targets. A row and its segment are one thing: the pointer over either lifts the segment, dims the rest and names it
	// in the centre; a press keeps it, and a second press opens its records. The rows are the keyboard's path (↑ ↓ Home
	// End, Enter opens, Esc clears). Under 660 px of card the two lists share one switch. The card reads its own query, so
	// it loads, fails and empties by itself. In privacy mode every amount is the mask; shares and shapes stay.
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { ownOweQuery } from '#lib/api/queries.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import { maskedMoney } from '#lib/privacy/mask.ts';
	import type { DisplayCurrency, RingPart, WealthCard } from '#lib/wealth/overview.ts';
	import CardFailed from './CardFailed.svelte';
	import { CENTRE, INNER, OUTER, RING_SIZE, dashOf, restingPart, stepRow } from './ring.ts';
	import './charts.css';

	let {
		card,
		view,
		currency,
		onStart
	}: { card: WealthCard; view: string; currency: DisplayCurrency; onStart?: ((id: string) => void) | undefined } =
		$props();

	const source = useWealth();
	const privacy = usePrivacy();
	const query = createQuery(() => ({ ...ownOweQuery(source, view, currency), placeholderData: keepPreviousData }));
	const data = $derived(query.data);

	let hover = $state<string | undefined>();
	let chosen = $state<string | undefined>();
	let focused = $state<string | undefined>();
	let ring = $state<'focus' | undefined>();
	let tab = $state<'own' | 'owe'>('own');
	let box = $state<DOMRectReadOnly | undefined>();
	let rowsEl = $state<HTMLElement | undefined>();

	const narrow = $derived((box?.width ?? 1000) < 660);
	const parts = $derived(data ? [...data.kinds, ...data.loans] : []);
	const active = $derived(parts.find((p) => p.id === (hover ?? focused ?? chosen)));
	const resting = $derived(data ? restingPart(data.kinds, data.loans) : undefined);
	const tabbable = $derived(focused ?? chosen ?? parts[0]?.id);
	const id = $derived(`card-${card.id}`);

	const amountText = (p: RingPart) => {
		const f = p.alt ?? p.fig;
		return privacy.on ? 'hidden' : maskedMoney(f.amount, f.currency, false, { whole: true });
	};
	const spoken = (p: RingPart) => `${p.label}, ${p.shareText}, ${amountText(p)}, ${p.note}`;

	function press(p: RingPart) {
		if (chosen === p.id) void goto(resolve(p.href));
		else chosen = p.id;
	}

	function visibleRows(): HTMLElement[] {
		return [...(rowsEl?.querySelectorAll<HTMLElement>('[data-part]') ?? [])].filter(
			(el) => el.getClientRects().length > 0
		);
	}

	function onkey(event: KeyboardEvent, p: RingPart) {
		if (event.key === 'Enter') {
			event.preventDefault();
			void goto(resolve(p.href));
			return;
		}
		if (event.key === 'Escape') {
			chosen = undefined;
			hover = undefined;
			return;
		}
		const rows = visibleRows();
		const next = stepRow(
			rows.map((el) => el.dataset.part ?? ''),
			p.id,
			event.key
		);
		if (next === undefined || next === p.id) return;
		event.preventDefault();
		rows.find((el) => el.dataset.part === next)?.focus();
	}

	// Moving to another row lets go of the one chosen, so one row at a time is pressed.
	function onfocus(event: FocusEvent, p: RingPart) {
		if (chosen !== p.id) chosen = undefined;
		focused = p.id;
		ring = (event.currentTarget as HTMLElement).matches(':focus-visible') ? 'focus' : undefined;
	}

	function onblur() {
		focused = undefined;
		ring = undefined;
	}

	function enter(event: PointerEvent, p: RingPart) {
		if (event.pointerType === 'mouse') hover = p.id;
	}

	// A press on the centre, or anywhere outside the ring and its rows, clears what was chosen.
	function onwindow(event: MouseEvent) {
		if (chosen === undefined) return;
		const target = event.target as Element | null;
		if (!target?.closest(`#${id}-body [data-part]`)) chosen = undefined;
	}

	const lifted = (p: RingPart) => p.id === active?.id;
	const dim = (p: RingPart) => active !== undefined && p.id !== active.id;
</script>

<svelte:window onclick={onwindow} />

<section
	class="mp-card cpad hc-band mp-ck-pulse"
	aria-labelledby={id}
	aria-busy={query.isPending}
	bind:contentRect={box}
>
	<div class="ctl">
		<h2 {id} class="mp-hl">{card.title}</h2>
		{#if data}
			<span class="mp-foot mp-ink2">{data.aside}</span>
		{:else if query.isPending}
			<span class="hc-sk hc-sk-h" aria-hidden="true"></span>
		{/if}
	</div>

	{#if data?.state === 'ready'}
		<div id="{id}-body" class="hc-a" class:t-own={tab === 'own'} class:t-owe={tab === 'owe'}>
			<div class="hc-ringw">
				<div class="mp-chartbox hc-ring" role="img" aria-label={data.aria}>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<svg
						width={RING_SIZE}
						height={RING_SIZE}
						viewBox="0 0 {RING_SIZE} {RING_SIZE}"
						aria-hidden="true"
						onpointerleave={() => (hover = undefined)}
					>
						<g transform="rotate(-90 {CENTRE} {CENTRE})">
							<circle
								class="hc-trk"
								class:hc-dim={active !== undefined}
								cx={CENTRE}
								cy={CENTRE}
								r={INNER.r}
								stroke-width={INNER.width}
							/>
							{#each [{ list: data.kinds, g: OUTER }, { list: data.loans, g: INNER }] as ringOf, n (n)}
								{#each ringOf.list as p (p.id)}
									{@const r = lifted(p) ? ringOf.g.liftR : ringOf.g.r}
									{@const d = dashOf(p, r)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<circle
										class="hc-seg {p.tone}"
										class:hc-dim={dim(p)}
										data-part={p.id}
										cx={CENTRE}
										cy={CENTRE}
										{r}
										stroke-width={lifted(p) ? ringOf.g.liftWidth : ringOf.g.width}
										pathLength="1000"
										stroke-dasharray={d.dasharray}
										stroke-dashoffset={d.dashoffset}
										onpointerenter={(event) => {
											enter(event, p);
										}}
										onclick={() => {
											press(p);
										}}
									/>
									{#if ring === 'focus' && focused === p.id}
										{@const f = dashOf(p, ringOf.g.focusR, 1)}
										<circle
											class="hc-farc"
											cx={CENTRE}
											cy={CENTRE}
											r={ringOf.g.focusR}
											stroke-width="3"
											pathLength="1000"
											stroke-dasharray={f.dasharray}
											stroke-dashoffset={f.dashoffset}
										/>
									{/if}
								{/each}
							{/each}
						</g>
					</svg>
					<div class="hc-ringc" aria-live="polite">
						{#if active}
							<span class="mp-foot mp-ink2 hc-cname">{active.label}</span>
							<span class="mp-num-l hc-cnum">{active.shareText}</span>
							<span class="mp-foot mp-w6 mp-num"><Amount fig={active.alt ?? active.fig} /></span>
						{:else if narrow && tab === 'owe' && !data.nothingOwed}
							<span class="mp-foot mp-ink2 hc-cname">{data.oweLabel}</span>
							<span class="mp-num-l hc-cnum">{data.oweShareText}</span>
							<span class="mp-foot mp-ink2">{data.ofOwn}</span>
						{:else if resting}
							<span class="mp-foot mp-ink2 hc-cname">{resting.label}</span>
							<span class="mp-num-l hc-cnum">{resting.shareText}</span>
						{/if}
					</div>
				</div>
				<p class="mp-foot mp-ink2 pp hc-key">{data.key}</p>
			</div>

			<div class="mp-seg hc-tabs" role="group" aria-label="Which list">
				<button
					type="button"
					class="mp-seg-i"
					class:on={tab === 'own'}
					aria-pressed={tab === 'own'}
					onclick={() => (tab = 'own')}
				>
					{data.ownLabel}
				</button>
				<button
					type="button"
					class="mp-seg-i"
					class:on={tab === 'owe'}
					aria-pressed={tab === 'owe'}
					onclick={() => (tab = 'owe')}
				>
					{data.oweLabel}
				</button>
			</div>

			<div class="contents" bind:this={rowsEl}>
				{#each [{ side: 'own', head: data.ownLabel, total: data.own, list: data.kinds, href: '/assets', more: 'All assets' }, { side: 'owe', head: data.oweLabel, total: data.owe, list: data.loans, href: '/debts', more: 'All debts' }] as leg (leg.side)}
					<div class="hc-leg {leg.side}">
						<div class="hc-legh">
							<span class="mp-over mp-ink2">{leg.head}</span>
							<span class="mp-sub mp-w6 mp-num"><Amount fig={leg.total} /></span>
						</div>
						{#each leg.list as p (p.id)}
							<button
								type="button"
								class="hc-row"
								class:on={chosen === p.id || focused === p.id}
								class:hov={hover === p.id}
								class:hc-dim={dim(p)}
								data-part={p.id}
								aria-pressed={chosen === p.id}
								aria-label={spoken(p)}
								tabindex={tabbable === p.id ? 0 : -1}
								onclick={() => {
									press(p);
								}}
								onkeydown={(event) => {
									onkey(event, p);
								}}
								onfocus={(event) => {
									onfocus(event, p);
								}}
								{onblur}
								onpointerenter={(event) => {
									enter(event, p);
								}}
								onpointerleave={() => (hover = undefined)}
							>
								<span class="hc-sw {p.tone}"></span>
								<span class="hc-rn">
									<span class="mp-sub mp-w6">{p.label}</span>
									<span class="mp-foot mp-ink2">{p.note}</span>
								</span>
								<span class="hc-rv">
									<span class="mp-sub mp-w6 mp-num"><Amount fig={p.fig} /></span>
									<span class="mp-foot mp-ink2 mp-num">
										{#if p.alt}<Amount fig={p.alt} /> ·{/if}
										{p.shareText}
									</span>
								</span>
								{#if chosen === p.id || focused === p.id}
									<span class="hc-go" aria-hidden="true"><ChevronRight class="lc lc-s" /></span>
								{/if}
							</button>
						{/each}
						{#if leg.side === 'owe'}
							{#each data.paid as p (p.id)}
								<div class="hc-row hc-none" class:hc-dim={active !== undefined}>
									<span class="hc-sw c0"></span>
									<span class="hc-rn">
										<span class="mp-sub mp-w6">{p.label}</span>
										<span class="mp-foot mp-ink2">{p.note}</span>
									</span>
									<span class="hc-rv"><span class="mp-sub mp-w6 mp-num"><Amount fig={p.fig} /></span></span>
								</div>
							{/each}
							{#if data.nothingOwed}
								<div class="hc-row hc-none">
									<span class="hc-sw c0"></span>
									<span class="hc-rn">
										<span class="mp-sub mp-w6">Nothing owed</span>
										<span class="mp-foot mp-ink2">No loan, mortgage or card balance on record</span>
									</span>
								</div>
							{/if}
						{/if}
						{#if leg.list.length > 0}
							<a class="mp-btn mp-btn-plain mp-btn-small hc-lnk" href={resolve(leg.href)}>
								{leg.more}<ChevronRight class="lc lc-s" aria-hidden="true" />
							</a>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else if data?.state === 'empty'}
		<div class="hc-a hc-a2">
			<div class="hc-ringw">
				<div class="mp-chartbox hc-ring" role="img" aria-label={data.aria}>
					<svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 {RING_SIZE} {RING_SIZE}" aria-hidden="true">
						<circle class="hc-trk" cx={CENTRE} cy={CENTRE} r={OUTER.r} stroke-width={OUTER.width} />
						<circle class="hc-trk" cx={CENTRE} cy={CENTRE} r={INNER.r} stroke-width={INNER.width} />
					</svg>
					<div class="hc-ringc">
						<span class="mp-sub mp-w6">No records</span>
						<span class="mp-foot mp-ink2">yet</span>
					</div>
				</div>
			</div>
			<div class="hc-msg">
				<span class="mp-icontile mp-neutral" aria-hidden="true"><MessageCircle class="lc lc-s" /></span>
				<div class="hc-msgt">
					<span class="mp-sub mp-w6">Nothing here yet</span>
					<span class="mp-foot mp-ink2">
						Tell MyPaisa about one thing you own or owe, in your own words. The ring fills as records arrive; nothing is
						added on this screen.
					</span>
				</div>
				<button type="button" class="mp-btn mp-btn-tinted mp-btn-small" onclick={() => onStart?.('chat')}>
					Open the chat
				</button>
			</div>
		</div>
	{:else if query.isError}
		<CardFailed safe="Your records are safe. Nothing was changed." onRetry={() => void query.refetch()} />
	{:else}
		<div class="hc-a hc-load" aria-hidden="true">
			<div class="hc-ringw">
				<div class="hc-ring">
					<svg width={RING_SIZE} height={RING_SIZE} viewBox="0 0 {RING_SIZE} {RING_SIZE}">
						<circle class="hc-trk" cx={CENTRE} cy={CENTRE} r={OUTER.r} stroke-width={OUTER.width} />
						<circle class="hc-trk" cx={CENTRE} cy={CENTRE} r={INNER.r} stroke-width={INNER.width} />
					</svg>
				</div>
				<span class="hc-sk hc-sk-k"></span>
			</div>
			{#each ['We own', 'We owe'] as head (head)}
				<div class="hc-leg">
					<div class="hc-legh">
						<span class="mp-over mp-ink2">{head}</span>
						<span class="hc-sk hc-sk-c"></span>
					</div>
					{#each [0, 1, 2, 3] as n (n)}
						<div class="hc-row hc-none">
							<span class="hc-sk hc-sk-sw"></span>
							<span class="hc-rn"><span class="hc-sk hc-sk-a"></span><span class="hc-sk hc-sk-b"></span></span>
							<span class="hc-rv"><span class="hc-sk hc-sk-c"></span><span class="hc-sk hc-sk-d"></span></span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
		<p class="sr-only" aria-live="polite">Reading what we own and owe…</p>
	{/if}
</section>
