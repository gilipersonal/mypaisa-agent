<script lang="ts">
	// The Projection (MA-224; board Web v4 · Projection, 1a the fan first, with MA-301's header): where the household's
	// net worth is heading. The title is the picker for its three views; Net worth is this page: the fan to a horizon
	// with its milestones on the line, the shortcut chips that ask in the chat, then the milestones, the plan items and
	// the assumptions with their sources. An admin corrects an assumption or a plan item in place; nothing is created
	// or deleted here. £ or ₹ follow the member's own choice (made on Home until the app's currency pill, MA-279), and
	// the eye hides every amount. Plans (MA-222) and Budget forecast (MA-262) are their own stories, named in the menu.
	import { createMutation, createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
	import { tick } from 'svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { correctProjectionMutation, plansQuery, projectionQuery, wealthKeys } from '#lib/api/queries.ts';
	import PlansView from '#lib/components/plans/PlansView.svelte';
	import { useShell } from '#lib/components/shell/actions.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import { readCurrency } from '#lib/wealth/prefs.ts';
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
	const privacy = usePrivacy();
	const shell = useShell();
	const queries = useQueryClient();

	function storage(): Storage | undefined {
		try {
			return window.localStorage;
		} catch {
			return undefined;
		}
	}

	const currency = readCurrency(storage());
	let view = $state<ViewId>('net');
	let horizon = $state<Horizon>(DEFAULT_HORIZON);
	let money = $state<MoneyBasis>('nominal');
	/** The figure being corrected in place: one at a time on the page. */
	let editing = $state<{ target: ProjectionCorrection['target']; id: string } | undefined>();
	let titleWrap: HTMLElement | undefined = $state();

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
						: current.head}
			</p>
		</div>
		<div class="hctl">
			<button
				type="button"
				class="iconbtn"
				class:on={privacy.on}
				aria-label="Privacy mode: hide amounts"
				aria-pressed={privacy.on}
				onclick={() => {
					privacy.toggle();
				}}
			>
				{#if privacy.on}<EyeOff class="lc" aria-hidden="true" />{:else}<Eye class="lc" aria-hidden="true" />{/if}
			</button>
		</div>
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
	{:else if view !== 'net' && view !== 'plans'}
		<div class="mp-card cpad loose">
			<h2 class="mp-hl">{current.label} is not built yet</h2>
			<p class="mp-foot mp-ink2 pp">{current.soon}</p>
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small self-start" onclick={() => (view = 'net')}>
				Back to Net worth
			</button>
		</div>
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
