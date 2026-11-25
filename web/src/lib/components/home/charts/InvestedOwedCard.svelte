<script lang="ts">
	// Invested against owed (MA-359; board Web v4 · Home charts, MA-355 c 1a): what we have invested (everything owned
	// but property) against what we owe, on the plan's path, with the month one passes the other marked and named; beside
	// it where the growth comes from by the horizon, in three parts. One row of chips (5, 10, 20, 30 years, opening at 5)
	// sets both. A pointer, a finger or the arrow keys scrub the line month by month and the headline becomes the reading;
	// Year by year is the same line as a table. The owed line is dashed and both are named, so colour is never the only
	// signal. The card reads its own query, so it loads, fails and empties by itself. In privacy mode every amount,
	// the axis's included, is the mask; the shapes, the months and ▲ ▼ stay.
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { investedOwedQuery } from '#lib/api/queries.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import { hideAmounts, maskAmounts, maskedMoney } from '#lib/privacy/mask.ts';
	import type { DisplayCurrency, GrowthPart, InvestedHorizon, WealthCard } from '#lib/wealth/overview.ts';
	import CardFailed from './CardFailed.svelte';
	import { across, areaD, down, indexAt, lineD, stepIndex, yAt } from './line.ts';
	import './charts.css';

	let {
		card,
		view,
		currency,
		onStart
	}: { card: WealthCard; view: string; currency: DisplayCurrency; onStart?: ((id: string) => void) | undefined } =
		$props();

	const CHIPS = [5, 10, 20, 30] as const;
	const source = useWealth();
	const privacy = usePrivacy();
	const query = createQuery(() => ({
		...investedOwedQuery(source, view, currency),
		placeholderData: keepPreviousData
	}));
	const data = $derived(query.data);

	let years = $state<InvestedHorizon['years']>(5);
	let hover = $state<number | undefined>();
	let held = $state<number | undefined>();
	let part = $state<GrowthPart['id'] | undefined>();
	let open = $state(false);

	const id = $derived(`card-${card.id}`);
	const h = $derived(data?.horizons.find((x) => x.years === years));
	const index = $derived(h === undefined ? undefined : (held ?? hover));
	const point = $derived(index === undefined ? undefined : data?.path[index]);
	const crossing = $derived(data?.crossing && h && data.crossing.index < h.points ? data.crossing : undefined);
	const last = $derived(h && data ? data.path[h.points - 1] : undefined);
	const first = $derived(data?.path[0]);

	const money = (amount: string) => maskedMoney(amount, 'GBP', privacy.on, { whole: true });
	const said = (amount: string) => (privacy.on ? 'hidden' : money(amount));
	const valueText = $derived(
		point
			? privacy.on
				? `Amounts hidden. ${point.label}`
				: `${point.label}: invested ${money(point.invested)}, owed ${money(point.owed)}`
			: undefined
	);

	function choose(next: InvestedHorizon['years']) {
		years = next;
		hover = undefined;
		held = undefined;
	}

	function fraction(event: PointerEvent): number {
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return box.width === 0 ? 0 : (event.clientX - box.left) / box.width;
	}

	function onpointermove(event: PointerEvent) {
		if (!h) return;
		if (event.pointerType === 'mouse') hover = indexAt(fraction(event), h.points);
		else if (held !== undefined) held = indexAt(fraction(event), h.points);
	}

	// A finger scrubs: a sideways drag begun on the line (an up or down drag still scrolls the page: touch-action pan-y).
	function onpointerdown(event: PointerEvent) {
		if (!h || event.pointerType === 'mouse') return;
		held = indexAt(fraction(event), h.points);
		const plot = event.currentTarget as HTMLElement;
		if (plot.hasPointerCapture(event.pointerId)) return;
		try {
			plot.setPointerCapture(event.pointerId);
		} catch {
			// a pointer that has already gone: the reading stays where it was put
		}
	}

	// Lifting the finger returns the headline to the takeaway, as the pointer leaving does.
	function release() {
		held = undefined;
	}

	function onkeydown(event: KeyboardEvent) {
		if (!h) return;
		if (event.key === 'Escape') {
			held = undefined;
			return;
		}
		const next = stepIndex(held ?? 0, event.key, event.shiftKey, h.points);
		if (next === undefined) return;
		event.preventDefault();
		held = next;
	}

	const chosenPart = $derived(h?.parts.find((p) => p.id === part));
</script>

<section class="mp-card cpad hc-band mp-ck-pulse" aria-labelledby={id} aria-busy={query.isPending}>
	<div class="ctl hc-ctl">
		<h2 {id} class="mp-hl">{card.title}</h2>
		{#if !data || data.state === 'ready'}
			<div class="mp-seg hc-chips" role="group" aria-label="How far ahead">
				{#each CHIPS as y (y)}
					<button
						type="button"
						class="mp-seg-i"
						class:on={years === y}
						aria-pressed={years === y}
						aria-label="{y} years"
						onclick={() => {
							choose(y);
						}}
					>
						{y} yr
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if data?.state === 'ready' && h && first && last}
		{#if data.notes.length > 0}
			<p class="mp-foot mp-ink2 pp">{data.notes.join(' ')}</p>
		{/if}
		{#if data.stale}
			<div class="hc-note">
				<Clock class="lc lc-s mp-ink2" aria-hidden="true" />
				<div class="hc-msgt">
					<span class="mp-foot mp-w6">{data.stale.title}</span>
					<span class="mp-foot mp-ink2">{maskAmounts(data.stale.text, privacy.on)}</span>
				</div>
			</div>
		{/if}
		<div class="hc-b">
			<div class="hc-bl">
				<div class="hc-head" class:hc-read={point !== undefined} aria-live="polite">
					{#if point}
						<span class="hc-big">{point.label}</span>
						<span class="hc-ro mp-sub">
							<span>
								<i class="k-inv"></i>Invested
								<b class="mp-num"><Amount fig={{ amount: point.invested, currency: 'GBP' }} /></b>
							</span>
							<span>
								<i class="k-owed"></i>Owed
								<b class="mp-num"><Amount fig={{ amount: point.owed, currency: 'GBP' }} /></b>
							</span>
							<span>
								{point.ahead ? '▲' : '▼'}
								<b class="mp-num"><Amount fig={{ amount: point.gap, currency: 'GBP' }} /></b>
								{point.ahead ? 'ahead' : 'behind'}
							</span>
						</span>
					{:else}
						<span class="hc-big">{crossing ? crossing.label : `Not by ${h.to}`}</span>
						<span class="mp-sub mp-ink2">
							{data.headline.text}
							<Amount fig={data.headline.fig} />
							{data.headline.after}
						</span>
					{/if}
				</div>
				<div class="hc-plotw">
					<div
						id="{id}-plot"
						class="mp-chartbox hc-plot"
						role="slider"
						tabindex="0"
						aria-label="Move through the months"
						aria-describedby="{id}-sum"
						aria-valuemin={0}
						aria-valuemax={h.points - 1}
						aria-valuenow={index ?? 0}
						aria-valuetext={valueText ?? (privacy.on ? 'Amounts hidden. Today' : undefined)}
						{onpointermove}
						{onpointerdown}
						onpointerup={release}
						onpointercancel={() => (held = undefined)}
						onpointerleave={() => (hover = undefined)}
						{onkeydown}
						onblur={() => (held = undefined)}
					>
						<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
							{#each h.lines as line (line.amount)}
								{@const y = yAt(line.amount, h.max).toFixed(2)}
								<path class="hc-grid" d="M0 {y} L100 {y}" />
							{/each}
							<path class="hc-grid hc-base" d="M0 100 L100 100" />
							<path class="hc-area" d={areaD(data.path, h)} />
							<path class="hc-owline" d={lineD(data.path, h, 'owed')} />
							<path class="hc-line" d={lineD(data.path, h, 'invested')} />
						</svg>
						{#each h.lines as line (line.amount)}
							<span class="hc-yl mp-num" style:top={down(line.amount, h.max)} aria-hidden="true">
								{privacy.on ? money(line.amount) : line.label}
							</span>
						{/each}
						<span class="mp-chartdot hdot-b" style:left="0%" style:top={down(first.invested, h.max)} aria-hidden="true"
						></span>
						<span
							class="mp-chartdot hdot-b hc-qdot"
							style:left="0%"
							style:top={down(first.owed, h.max)}
							aria-hidden="true"
						></span>
						{#if crossing}
							{@const at = data.path[crossing.index]}
							{#if at}
								<span
									class="mp-chartdot"
									class:beacon={point === undefined}
									class:hc-pastdot={point !== undefined}
									style:left={across(crossing.index, h.points)}
									style:top={down(at.invested, h.max)}
									aria-hidden="true"
								></span>
								{#if h.crossingLabel && point === undefined}
									<span
										class="mp-chartlbl hc-clbl"
										style:left={across(crossing.index, h.points)}
										style:top={down(at.invested, h.max)}
										aria-hidden="true"
									>
										{crossing.label}
									</span>
								{/if}
							{/if}
						{/if}
						<span class="hc-endl mp-cap mp-w6" style:top={down(last.invested, h.max)} aria-hidden="true">Invested</span>
						<span class="hc-endl mp-cap mp-w6" style:top={down(last.owed, h.max)} aria-hidden="true">Owed</span>
						{#if point && index !== undefined}
							<div class="mp5-scrub on" aria-hidden="true">
								<span class="mp5-scrub-line" style:left={across(index, h.points)}></span>
								<span class="mp5-scrub-dot" style:left={across(index, h.points)} style:top={down(point.invested, h.max)}
								></span>
								<span
									class="mp5-scrub-dot hc-sd-q"
									style:left={across(index, h.points)}
									style:top={down(point.owed, h.max)}
								></span>
							</div>
						{/if}
					</div>
					<div class="mp-chartaxis hc-ax mp-ink2" aria-hidden="true">
						{#each h.axis as tick, n (tick.label)}
							<span class:ax0={n === 0} class:ax1={n === h.axis.length - 1} style:left="{(tick.at * 100).toFixed(2)}%">
								{tick.label}
							</span>
						{/each}
					</div>
					<p id="{id}-sum" class="sr-only">{hideAmounts(h.aria, privacy.on)}</p>
				</div>
				<div class="hc-lgd mp-ink2" aria-hidden="true">
					<span><i class="k-inv"></i>Invested, all we own except property</span>
					<span><i class="k-owed"></i>Owed</span>
				</div>
			</div>

			<div class="hc-br">
				<span class="mp-over mp-ink2">Where the growth comes from</span>
				<div class="hc-head">
					<span class="mp-num-l hc-cnum">{h.growthShare}</span>
					<span class="mp-sub mp-ink2">
						is growth and interest, of the <Amount fig={h.invested} /> invested by {h.to}
					</span>
				</div>
				<div class="hc-stk" role="img" aria-label={h.partsAria}>
					{#each h.parts as p (p.id)}
						<span class={p.tone} class:hc-dim={chosenPart && chosenPart.id !== p.id} style:flex="{p.fig.amount} 1 0"
						></span>
					{/each}
				</div>
				<div class="hc-rows">
					{#each h.parts as p (p.id)}
						<button
							type="button"
							class="hc-row"
							class:on={part === p.id}
							class:hc-dim={part !== undefined && part !== p.id}
							aria-pressed={part === p.id}
							aria-label="{p.label}, {said(p.fig.amount)}, {p.shareText} of what is invested by {h.to}"
							onclick={() => (part = part === p.id ? undefined : p.id)}
						>
							<span class="hc-sw {p.tone}"></span>
							<span class="hc-rn">
								<span class="mp-sub mp-w6">{p.label}</span>
								{#if part === p.id}<span class="mp-foot mp-ink2">{p.about}</span>{/if}
							</span>
							<span class="hc-rv">
								<span class="mp-sub mp-w6 mp-num"><Amount fig={p.fig} /></span>
								{#if part === p.id}<span class="mp-foot mp-ink2 mp-num">{p.shareText}</span>{/if}
							</span>
						</button>
					{/each}
				</div>
				<button
					type="button"
					class="mp-btn mp-btn-plain mp-btn-small hc-lnk"
					aria-expanded={open}
					aria-controls="{id}-years"
					onclick={() => (open = !open)}
				>
					Year by year<ChevronDown class="lc lc-s" aria-hidden="true" />
				</button>
			</div>
		</div>
		{#if open}
			<div id="{id}-years" class="hc-tblw">
				<table class="hc-tbl">
					<caption class="mp-foot mp-ink2">
						Each December on the plan’s path. ▲ invested is ahead of owed, ▼ behind.
					</caption>
					<thead>
						<tr>
							<th scope="col">Year end</th>
							<th scope="col">Invested</th>
							<th scope="col">Owed</th>
							<th scope="col">Ahead or behind</th>
						</tr>
					</thead>
					<tbody>
						{#each h.rows as row (row.label)}
							<tr>
								<th scope="row"><span aria-hidden="true">{row.label}</span><span class="sr-only">{row.long}</span></th>
								<td class="mp-num"><Amount fig={row.invested} /></td>
								<td class="mp-num"><Amount fig={row.owed} /></td>
								<td class="mp-num">
									<span aria-hidden="true">{row.ahead ? '▲' : '▼'}</span>
									<Amount fig={row.gap} />
									<span class="sr-only">{row.ahead ? 'ahead' : 'behind'}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		<p class="mp-foot mp-ink2 pp">{data.foot}</p>
	{:else if data?.state === 'nothing-owed'}
		<div class="hc-msg">
			<span class="mp-icontile mp-neutral" aria-hidden="true"><CircleCheck class="lc lc-s" /></span>
			<div class="hc-msgt">
				<span class="mp-sub mp-w6">Nothing is owed</span>
				<span class="mp-foot mp-ink2">
					There is no balance for what you have invested to pass. When a loan, a mortgage or a card balance is on
					record, the two lines and their crossing show here.
				</span>
			</div>
		</div>
	{:else if data?.state === 'empty'}
		<div class="hc-msg">
			<span class="mp-icontile mp-neutral" aria-hidden="true"><TrendingUp class="lc lc-s" /></span>
			<div class="hc-msgt">
				<span class="mp-sub mp-w6">Nothing to project yet</span>
				<span class="mp-foot mp-ink2">
					Once there is something you own or owe on record, this card shows how what you have invested grows and when it
					passes what you owe.
				</span>
			</div>
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small" onclick={() => onStart?.('chat')}>
				Open the chat
			</button>
		</div>
	{:else if query.isError}
		<CardFailed
			safe="The Projection’s last run is unchanged. Nothing was changed."
			onRetry={() => void query.refetch()}
		/>
	{:else}
		<div class="hc-b" aria-hidden="true">
			<div class="hc-bl">
				<div class="hc-head">
					<span class="hc-sk hc-sk-big"></span>
					<span class="hc-sk hc-sk-line"></span>
				</div>
				<div class="hc-plotw"><span class="hc-sk hc-sk-plot"></span></div>
			</div>
			<div class="hc-br">
				<span class="mp-over mp-ink2">Where the growth comes from</span>
				<span class="hc-sk hc-sk-big"></span>
				<span class="hc-sk hc-sk-bar"></span>
				<div class="hc-rows">
					{#each [0, 1, 2] as n (n)}
						<div class="hc-row hc-none">
							<span class="hc-sk hc-sk-sw"></span>
							<span class="hc-rn"><span class="hc-sk hc-sk-a"></span></span>
							<span class="hc-rv"><span class="hc-sk hc-sk-c"></span></span>
						</div>
					{/each}
				</div>
			</div>
		</div>
		<p class="sr-only" aria-live="polite">Reading invested against owed…</p>
	{/if}
</section>
