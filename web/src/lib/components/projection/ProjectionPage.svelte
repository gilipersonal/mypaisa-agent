<script lang="ts">
	// The Projection (MA-224; board Web v4 · Projection, 1a the fan first, with MA-301's header): where the household's
	// net worth is heading. The title is the picker for its three views; Net worth is this page: the fan to a horizon
	// with its milestones on the line, the shortcut chips that ask in the chat, then the milestones, the plan items and
	// the assumptions with their sources. An admin corrects an assumption or a plan item in place; nothing is created
	// or deleted here. The head's four pills (MA-358, Web v4 · Header controls b 1a) sit at its top right, beside the
	// title menu and never sharing a control with it: the currency they set is the one the figures are in, and Hide
	// amounts hides every amount. Plans (MA-222) is its own story, named in the menu; Budget forecast is MA-262's view,
	// in place under the same title, keeping the horizon and the money.
	import { createMutation, createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
	import { tick } from 'svelte';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import {
		correctProjectionMutation,
		overviewQuery,
		plansQuery,
		projectionQuery,
		wealthKeys
	} from '#lib/api/queries.ts';
	import BudgetForecast from '#lib/components/forecast/BudgetForecast.svelte';
	import { useHeaderChoice } from '#lib/components/header/choice.svelte.ts';
	import HeaderControls from '#lib/components/header/HeaderControls.svelte';
	import PlansView from '#lib/components/plans/PlansView.svelte';
	import { useShell } from '#lib/components/shell/actions.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { Overview } from '#lib/wealth/overview.ts';
	import {
		DEFAULT_HORIZON,
		HORIZONS,
		type Horizon,
		type MoneyBasis,
		type ProjectionCorrection
	} from '#lib/wealth/projection.ts';
	import Assumptions from './Assumptions.svelte';
	import ChoiceMenu from './ChoiceMenu.svelte';
	import FanChart from './FanChart.svelte';
	import Milestones from './Milestones.svelte';
	import PlanItems from './PlanItems.svelte';
	import { MONEY, VIEWS, moneyOf, viewOf, type ViewId } from './views.ts';

	const source = useWealth();
	const choice = useHeaderChoice();
	const shell = useShell();
	const queries = useQueryClient();

	const currency = $derived(choice.currency);
	let view = $state<ViewId>('net');
	let horizon = $state<Horizon>(DEFAULT_HORIZON);
	let money = $state<MoneyBasis>('nominal');
	/** The figure being corrected in place: one at a time on the page. */
	let editing = $state<{ target: ProjectionCorrection['target']; id: string } | undefined>();
	let titleWrap: HTMLElement | undefined = $state();
	/** The Budget forecast's line under the title, once it is read. */
	let forecastHead = $state('');

	const projection = createQuery(() => ({
		...projectionQuery(source, horizon, money, currency),
		placeholderData: keepPreviousData
	}));
	const correct = createMutation(() => ({
		...correctProjectionMutation(source),
		// As a records.changed frame does (MA-208): every wealth page reads again. On stubbed data the fan it reads is
		// the same stored run, since no engine is behind the seam yet; only the corrected row and its saved state move.
		onSuccess: () => queries.invalidateQueries({ queryKey: wealthKeys.all })
	}));

	// Whose view lists the household's members, and the currency menu the day's rate, from the overview Home reads
	// with the same key, so coming from Home it is already in hand.
	const people = createQuery(() => ({
		...overviewQuery(source, choice.view, choice.currency),
		placeholderData: keepPreviousData,
		select: (o: Overview) => ({
			views: o.views,
			rate: o.hero.rate
		})
	}));

	// The Plans view (MA-222): read only while it is the view shown.
	const plans = createQuery(() => ({
		...plansQuery(source, horizon, money, currency),
		enabled: view === 'plans',
		placeholderData: keepPreviousData
	}));

	const data = $derived(projection.data);
	const current = $derived(viewOf(view));
	const editingIn = (target: ProjectionCorrection['target']) => (editing?.target === target ? editing.id : undefined);
	const refused = $derived(correct.error?.message);

	function edit(target: ProjectionCorrection['target'], id: string) {
		correct.reset();
		editing = { target, id };
	}

	/** Puts focus back on the figure that was being corrected, once its row is drawn again. */
	async function back(target: string, id: string) {
		await tick();
		document.getElementById(`pj-fig-${target}-${id}`)?.focus();
	}

	function cancel() {
		const was = editing;
		editing = undefined;
		correct.reset();
		if (was) void back(was.target, was.id);
	}

	async function save(correction: ProjectionCorrection) {
		try {
			await correct.mutateAsync(correction);
		} catch {
			return; // the row stays open and says why
		}
		editing = undefined;
		void back(correction.target, correction.id);
	}
</script>

<div class="mp-pagepad proj">
	<header class="mp-pagehead">
		<div class="ttlwrap" bind:this={titleWrap}>
			<h1 id="page-title" class="ttlh">
				<ChoiceMenu
					kind="title"
					value={view}
					options={VIEWS}
					label="Projection: {current.label}. Change view"
					menuLabel="Projection, the view"
					testId={TestIDs.projectionView}
					anchor={titleWrap}
					onChoose={(id: string) => (view = viewOf(id).id)}
				/>
			</h1>
			<p class="mp-foot mp-ink2">
				{view === 'net'
					? (data?.head ?? 'Net worth')
					: view === 'plans'
						? (plans.data?.head ?? current.head)
						: forecastHead || current.head}
			</p>
		</div>
		<HeaderControls views={people.data?.views} rate={people.data?.rate} />
	</header>

	{#if view === 'plans' && plans.data && !plans.data.empty}
		<PlansView
			plans={plans.data}
			{horizon}
			{money}
			onHorizon={(h: Horizon) => (horizon = h)}
			onMoney={(m: MoneyBasis) => (money = m)}
		/>
	{:else if view === 'plans' && plans.isError}
		<div class="mp-card cpad loose" role="alert">
			<h2 class="mp-hl">The plans could not be read</h2>
			<p class="mp-foot mp-ink2 pp">Nothing is lost: the plans are as they were. Try again in a moment.</p>
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small self-start" onclick={() => plans.refetch()}>
				Try again
			</button>
		</div>
	{:else if view === 'plans' && !plans.data}
		<div class="mp-skel h-96" aria-hidden="true"></div>
		<p class="sr-only" aria-live="polite">Reading the plans…</p>
	{:else if view === 'budget'}
		<BudgetForecast bind:horizon bind:money {currency} bind:head={forecastHead} />
	{:else if data?.empty}
		<div class="mp-card cpad loose">
			<h2 class="mp-hl">Nothing to project yet</h2>
			<p class="mp-foot mp-ink2 pp">
				The Projection draws where the household’s net worth is heading once it has records. Tell MyPaisa what you own
				and owe in the chat.
			</p>
			<button
				type="button"
				class="mp-btn mp-btn-tinted mp-btn-small self-start"
				onclick={() => {
					shell.openChat();
				}}
			>
				<MessageCircle class="lc lc-s" aria-hidden="true" />Open the chat
			</button>
		</div>
	{:else if data}
		<section
			class="mp-hero heroP"
			aria-label="The fan: net worth to {data.horizon} years"
			data-testid={TestIDs.projectionHero}
		>
			<div class="flex flex-col gap-0.5">
				<div class="herot">
					<span class="mp-sub mp-hero-2">{data.hero.over}</span>
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
				<span class="mp-num-hero" aria-live="polite"><Amount fig={data.hero.mid} /></span>
			</div>
			<p class="pp mp-sub mp-hero-2">
				From <Amount fig={data.hero.from} /> today. 8 in 10 of the engine’s runs end between
				<Amount fig={data.hero.low} /> and <Amount fig={data.hero.high} />.
			</p>
			{#key `${String(data.horizon)}:${data.money}:${data.currency}`}
				<FanChart fan={data.fan} />
			{/key}
			<div class="lgd onhero" aria-hidden="true">
				<span><i class="sw-line"></i>Middle path</span>
				<span><i class="sw-band"></i>8 in 10 runs</span>
				<span><i class="sw-dot"></i>A loan ends</span>
				<span><i class="sw-sq"></i>A plan item</span>
				<span><i class="sw-tk"></i>A maturity or rate change</span>
			</div>
			<div class="hzchips" role="group" aria-label="Horizon" data-testid={TestIDs.projectionHorizon}>
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
		</section>

		<div class="chips" role="group" aria-label="Ask in the chat">
			{#each data.chips as question (question)}
				<button
					type="button"
					class="mp-btn mp-btn-tinted mp-btn-small"
					onclick={() => {
						shell.openChat(question);
					}}
				>
					<MessageCircle class="lc lc-s" aria-hidden="true" />{question}
				</button>
			{/each}
		</div>

		<div class="pcols">
			<div class="pstack">
				<Milestones milestones={data.milestones} />
				<PlanItems
					plan={data.plan}
					editing={editingIn('plan')}
					error={refused}
					onEdit={(id: string) => {
						edit('plan', id);
					}}
					onSave={(c: ProjectionCorrection) => void save(c)}
					onCancel={cancel}
					onAdd={() => {
						shell.openChat();
					}}
				/>
			</div>
			<Assumptions
				assumptions={data.assumptions}
				editing={editingIn('assumption')}
				error={refused}
				onEdit={(id: string) => {
					edit('assumption', id);
				}}
				onSave={(c: ProjectionCorrection) => void save(c)}
				onCancel={cancel}
			/>
		</div>
		<p class="pp mp-foot mp-ink2">{data.foot}</p>
	{:else if projection.isError}
		<div class="mp-card cpad loose" role="alert">
			<h2 class="mp-hl">The Projection could not be read</h2>
			<p class="mp-foot mp-ink2 pp">Nothing is lost: the records are as they were. Try again in a moment.</p>
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small self-start" onclick={() => projection.refetch()}>
				Try again
			</button>
		</div>
	{:else}
		<div class="mp-skel h-96" aria-hidden="true"></div>
		<div class="pcols" aria-hidden="true">
			<div class="mp-skel h-64"></div>
			<div class="mp-skel h-64"></div>
		</div>
		<p class="sr-only" aria-live="polite">Reading the Projection…</p>
	{/if}
</div>
