<script lang="ts">
	// The Projection's Budget forecast view (MA-262; board Web v4 · Budget forecast, 1a the surplus first, and its states
	// board): each year's leanest month against the admins' floor to the horizon, the years below it flagged by code;
	// then the selected year's lines, which add up to its surplus, its months, and the flows behind its spending. A tap
	// on a bar picks the year; a tap on Spending opens what makes it. Money is the chart card's corner button and the
	// horizon its chips, shared with the Net worth view; £ or ₹ follow the member's own choice. Nothing is created or
	// changed here: Ways to cover it opens the chat, where an admin rearranges the budget (MA-263), and a member who is
	// not an admin is told whose the plans are.
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { tick } from 'svelte';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Lock from '@lucide/svelte/icons/lock';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import SquareFunction from '@lucide/svelte/icons/square-function';
	import { budgetForecastQuery } from '#lib/api/queries.ts';
	import ChoiceMenu from '#lib/components/projection/ChoiceMenu.svelte';
	import { MONEY, moneyOf } from '#lib/components/projection/views.ts';
	import { useShell } from '#lib/components/shell/actions.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { DisplayCurrency } from '#lib/wealth/overview.ts';
	import { HORIZONS, type Horizon, type MoneyBasis } from '#lib/wealth/projection.ts';
	import Said from './Said.svelte';
	import SurplusChart from './SurplusChart.svelte';

	let {
		horizon = $bindable(),
		money = $bindable(),
		currency,
		head = $bindable()
	}: {
		horizon: Horizon;
		money: MoneyBasis;
		currency: DisplayCurrency;
		/** Under the page's title: how far, in what money, and which run. */
		head?: string;
	} = $props();

	const source = useWealth();
	const shell = useShell();
	const privacy = usePrivacy();

	/** The year asked for; until one is, the chart's own (the first year cash goes short, or the leanest). */
	let year = $state<number | undefined>();
	let traceOpen = $state(true);
	let monthsShown = $state<boolean | undefined>();
	let traceCard: HTMLElement | undefined = $state();

	const forecast = createQuery(() => ({
		...budgetForecastQuery(source, horizon, money, currency, year),
		placeholderData: keepPreviousData
	}));
	const data = $derived(forecast.data);
	// The months stay folded where a pot already holds every lean month at the floor (board S1); open otherwise.
	const months = $derived(monthsShown ?? data?.pot === undefined);
	const running = $derived(Boolean(data) && forecast.isFetching && !forecast.isPlaceholderData && !forecast.isError);
	const failed = $derived(Boolean(data) && forecast.isError);

	$effect(() => {
		head = data?.head ?? 'What comes in and goes out, each year to the horizon';
	});

	async function openTrace() {
		traceOpen = !traceOpen;
		if (!traceOpen) return;
		await tick();
		traceCard?.scrollIntoView({ block: 'nearest' });
	}
</script>

<div class="bf">
	{#if running}
		<div class="banner" role="status">
			<LoaderCircle class="lc" aria-hidden="true" />
			<div class="grow1">
				<span class="mp-sub mp-w6">Running the forecast again</span>
				<span class="mp-foot mp-ink2">
					The figures below are the run of {data?.run} until the new one lands, in a few seconds.
				</span>
				<div class="pbar" aria-hidden="true"><span></span></div>
			</div>
		</div>
	{:else if failed}
		<div class="banner err" role="alert">
			<CircleAlert class="lc" aria-hidden="true" />
			<div class="grow1">
				<span class="mp-sub mp-w6">The new run did not finish</span>
				<span class="mp-foot mp-ink2">
					The forecast still shows the run of {data?.run}. Try again, or ask in the chat.
				</span>
				<div class="btnrow">
					<button type="button" class="mp-btn mp-btn-primary mp-btn-small" onclick={() => forecast.refetch()}>
						<RefreshCw class="lc lc-s" aria-hidden="true" />Try again
					</button>
					<button
						type="button"
						class="mp-btn mp-btn-tinted mp-btn-small"
						onclick={() => {
							shell.openChat();
						}}
					>
						<MessageCircle class="lc lc-s" aria-hidden="true" />Ask in the chat
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if data?.empty}
		<div class="mp-card empty">
			<span class="eico"><ChartPie class="lc" aria-hidden="true" /></span>
			<h2 class="mp-hl">No budget yet, so nothing to forecast</h2>
			<p class="mp-sub mp-ink2 pp">
				The forecast is built from each member’s take-home pay, a monthly plan for each category and the household’s
				EMIs. Tell MyPaisa in the chat, in your own words:
			</p>
			<ul class="mp-sub">
				<li>“My take-home is £4,350 a month”</li>
				<li>“Plan £650 a month for groceries”</li>
				<li>or send a payslip or a bank statement</li>
			</ul>
			<button
				type="button"
				class="mp-btn mp-btn-primary mp-btn-small"
				onclick={() => {
					shell.openChat();
				}}
			>
				<MessageCircle class="lc lc-s" aria-hidden="true" />Set up the budget in the chat
			</button>
			<p class="mp-foot mp-ink2 pp">Nothing is created here: the chat asks, you confirm, and the forecast fills in.</p>
		</div>
	{:else if data}
		<div class="stk" class:stale={running}>
			<section class="mp-card cpad" aria-labelledby="bf-chart" data-testid={TestIDs.forecastChart}>
				<div class="bfh">
					<div class="grow1">
						<h2 id="bf-chart" class="mp-hl">{data.chart.title}</h2>
						<span class="mp-foot mp-ink2">{data.chart.sub}</span>
					</div>
					<ChoiceMenu
						kind="corner"
						value={money}
						options={MONEY}
						label="Money: {moneyOf(money).label}. Change it"
						menuLabel="Money"
						testId={TestIDs.projectionMoney}
						onChoose={(id: string) => (money = moneyOf(id).id)}
					/>
				</div>
				{#each data.chart.flags as flag (flag.text)}
					<div class="flagl">
						<span class="mp-chip chip-s mp-alertchip">{flag.text}</span>
						<span class="mp-foot"><Said parts={flag.said} /></span>
					</div>
				{/each}
				<SurplusChart
					chart={data.chart}
					currency={data.currency}
					selected={data.selected}
					onSelect={(y: number) => (year = y)}
				/>
				<div class="blgd" aria-hidden="true">
					{#each data.chart.legend as key (key.key)}
						<span><i class="k-{key.key}"></i>{privacy.on ? key.textPrivate : key.text}</span>
					{/each}
				</div>
				<div class="hzchips oncard" role="group" aria-label="Horizon" data-testid={TestIDs.projectionHorizon}>
					{#each HORIZONS as years (years)}
						<button
							type="button"
							class="hzc"
							class:on={horizon === years}
							aria-pressed={horizon === years}
							onclick={() => (horizon = years)}
						>
							{years} yrs
						</button>
					{/each}
				</div>
				{#each data.chart.notes.filter((n) => !(privacy.on && n.hidden)) as note, n (n)}
					<p class="pp mp-foot mp-ink2"><Said parts={note.said} /></p>
				{/each}
			</section>

			<div class="mp-cols">
				<div class="mp-col">
					<section class="mp-card cpad" aria-labelledby="bf-year" data-testid={TestIDs.forecastYear}>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h2 id="bf-year" class="mp-t2" aria-live="polite">{data.year.title}</h2>
							<span class="mp-chip chip-s {data.year.chip.alert ? 'mp-alertchip' : 'chip-n'}">
								{data.year.chip.text}
							</span>
						</div>
						<span class="mp-foot mp-ink2 ptab-meta">{data.year.meta}</span>
						<div>
							{#each data.year.lines as l (l.id)}
								<div class="yl">
									<div class="grow1">
										<span class="mp-sub mp-w6">{l.title}</span>
										<span class="mp-foot mp-ink2"><Said parts={l.sub} drop={!l.plan} /></span>
									</div>
									{#if l.traced}
										<button
											type="button"
											class="fig tap"
											aria-expanded={traceOpen}
											aria-controls="bf-trace"
											onclick={() => void openTrace()}
										>
											<Amount fig={l.fig} /><span class="sr-only">, what makes it</span>
										</button>
									{:else}
										<span class="fig"><Amount fig={l.fig} /></span>
									{/if}
								</div>
							{/each}
							<div class="yl tot">
								<div class="grow1">
									<span class="mp-hl">Surplus</span>
									<span class="mp-foot mp-ink2">{data.year.surplusNote}</span>
								</div>
								<span class="fig" class:c-alert={data.year.negative}><Amount fig={data.year.surplus} /></span>
							</div>
						</div>
						{#if data.year.fromCash.length > 0}
							<div>
								<div class="blh"><span class="mp-over mp-ink2">Paid from cash</span></div>
								{#each data.year.fromCash as row (row.label)}
									<div class="bl">
										<div class="grow1">
											<span class="mp-sub mp-w6">{row.label}</span>
											<span class="mp-foot mp-ink2">{row.sub}</span>
										</div>
										<span class="fig" class:c-alert={row.alert}><Said parts={row.said} /></span>
									</div>
								{/each}
							</div>
						{/if}
						<div class="kvs">
							{#each data.year.facts as fact (fact.label)}
								<div class="kt">
									<span class="mp-foot mp-ink2">{fact.label}</span>
									<span class="mp-sub mp-w6" class:c-alert={fact.alert}><Said parts={fact.said} /></span>
								</div>
							{/each}
						</div>
						{#if data.year.lock}
							<div class="lockl">
								<Lock class="lc" aria-hidden="true" /><span class="mp-foot mp-ink2">{data.year.lock}</span>
							</div>
						{/if}
						<div class="btnrow">
							{#if data.year.months}
								<button
									type="button"
									class="mp-btn mp-btn-tinted mp-btn-small"
									aria-expanded={months}
									aria-controls="bf-months"
									onclick={() => (monthsShown = !months)}
								>
									{#if months}<ChevronUp class="lc lc-s" aria-hidden="true" />Hide the months{:else}<ChevronDown
											class="lc lc-s"
											aria-hidden="true"
										/>Show the months{/if}
								</button>
							{/if}
							{#if data.year.canCover}
								<button
									type="button"
									class="mp-btn mp-btn-primary mp-btn-small"
									onclick={() => {
										shell.openChat();
									}}
								>
									<MessageCircle class="lc lc-s" aria-hidden="true" />Ways to cover it
								</button>
							{:else if data.year.lock}
								<button
									type="button"
									class="mp-btn mp-btn-tinted mp-btn-small"
									onclick={() => {
										shell.openChat();
									}}
								>
									<MessageCircle class="lc lc-s" aria-hidden="true" />Ask about it in the chat
								</button>
							{/if}
						</div>
					</section>
					{#if data.year.months && months}
						<section
							id="bf-months"
							class="mp-card cpad"
							aria-labelledby="bf-months-h"
							data-testid={TestIDs.forecastMonths}
						>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<h2 id="bf-months-h" class="mp-hl">{data.year.months.title}</h2>
								<span class="mp-foot mp-ink2">{data.year.months.sub}</span>
							</div>
							<div class="mtab">
								{#each data.year.months.rows as m (m.label)}
									<span class="mt mp-w6">{m.label}</span>
									<span class="mt mnote"><Said parts={m.note} /></span>
									<span class="mt mfig" class:c-alert={m.flagged}><Amount fig={m.fig} /></span>
								{/each}
							</div>
						</section>
					{/if}
				</div>
				<div class="mp-col">
					{#if traceOpen}
						<section
							id="bf-trace"
							class="mp-card cpad"
							aria-labelledby="bf-trace-h"
							data-testid={TestIDs.forecastTrace}
							bind:this={traceCard}
						>
							<div class="flex flex-col gap-1">
								<span class="mp-over mp-ink2">{data.trace.over}</span>
								<h2 id="bf-trace-h" class="mp-hl">{data.trace.title}, <Amount fig={data.trace.total} /></h2>
							</div>
							<p class="mp-foot mp-ink2 pp">{data.trace.note}</p>
							<div>
								{#each data.trace.rows as row (row.name)}
									<div class="trl">
										<div class="grow1">
											<span class="mp-sub mp-w6">{row.name}</span>
											<span class="mp-foot mp-ink2"><Said parts={row.sub} /></span>
										</div>
										<span class="fig"><Amount fig={row.fig} /></span>
									</div>
								{/each}
								<div class="trl sum">
									<div class="grow1"><span class="mp-sub mp-w6">{data.trace.totalLabel}</span></div>
									<span class="fig"><Amount fig={data.trace.total} /></span>
								</div>
							</div>
							<span class="srcchip"><SquareFunction class="lc" aria-hidden="true" />{data.trace.source}</span>
						</section>
					{/if}
					{#if data.pot}
						<section class="mp-card cpad" aria-labelledby="bf-pot">
							<div class="flex flex-col gap-1">
								<span class="mp-over mp-ink2">{data.pot.over}</span>
								<h2 id="bf-pot" class="mp-hl">{data.pot.title}</h2>
							</div>
							<p class="mp-foot mp-ink2 pp">{data.pot.sub}</p>
							<div class="mtab">
								{#each data.pot.rows as row (row.label)}
									<span class="mt mp-w6">{row.label}</span>
									<span class="mt mnote"><Said parts={row.note} /></span>
									<span class="mt mfig"><Amount fig={row.fig} /></span>
								{/each}
							</div>
							<div class="kvs">
								{#each data.pot.totals as t (t.label)}
									<div class="kt">
										<span class="mp-foot mp-ink2">{t.label}</span>
										<span class="mp-sub mp-w6"><Amount fig={t.fig} /></span>
									</div>
								{/each}
							</div>
						</section>
					{/if}
				</div>
			</div>
		</div>
		<p class="pp mp-foot mp-ink2">{data.foot}</p>
	{:else if forecast.isError}
		<div class="mp-card cpad" role="alert">
			<h2 class="mp-hl">The Budget forecast could not be read</h2>
			<p class="mp-foot mp-ink2 pp">Nothing is lost: the plans are saved as they were. Try again in a moment.</p>
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small self-start" onclick={() => forecast.refetch()}>
				Try again
			</button>
		</div>
	{:else}
		<div class="mp-skel h-96" aria-hidden="true"></div>
		<div class="pcols" aria-hidden="true">
			<div class="mp-skel h-64"></div>
			<div class="mp-skel h-64"></div>
		</div>
		<p class="sr-only" aria-live="polite">Reading the Budget forecast…</p>
	{/if}
</div>
