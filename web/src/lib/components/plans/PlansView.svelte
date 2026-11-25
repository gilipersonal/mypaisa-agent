<script lang="ts">
	// The Projection's Plans view (MA-222; board Web v4 · Plans tab, 3a bars on a timeline, and Web v4 · Plans tab 3a
	// states): how many plans and the run they make, then each plan on a lane across the horizon, with the horizon chips
	// under the lanes and the money in the card's corner. A row opens the plan: the admin's words, its figures to
	// correct in place, Pause or Resume, End it, and its history. Nothing is created here: Add in chat opens the chat.
	// A member who is not an admin sees the same plans plain, without pencils or menus, and saves nothing.
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { tick } from 'svelte';
	import { DropdownMenu } from 'bits-ui';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import CirclePause from '@lucide/svelte/icons/circle-pause';
	import CirclePlay from '@lucide/svelte/icons/circle-play';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Lock from '@lucide/svelte/icons/lock';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Pause from '@lucide/svelte/icons/pause';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Play from '@lucide/svelte/icons/play';
	import { changePlanMutation, correctProjectionMutation, wealthKeys } from '#lib/api/queries.ts';
	import Icon from '#lib/components/projection/Icon.svelte';
	import ChoiceMenu from '#lib/components/projection/ChoiceMenu.svelte';
	import { MONEY, moneyOf } from '#lib/components/projection/views.ts';
	import { useShell } from '#lib/components/shell/actions.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import { hideAmounts, maskAmounts } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { PlanChange, Plans } from '#lib/wealth/plans.ts';
	import {
		HORIZONS,
		type Horizon,
		type MoneyBasis,
		type PlanField,
		type ProjectionCorrection
	} from '#lib/wealth/projection.ts';
	import EndDialog from './EndDialog.svelte';
	import PlanSheet from './PlanSheet.svelte';

	let {
		plans,
		horizon,
		money,
		onHorizon,
		onMoney
	}: {
		plans: Plans;
		horizon: Horizon;
		money: MoneyBasis;
		onHorizon: (h: Horizon) => void;
		onMoney: (m: MoneyBasis) => void;
	} = $props();

	const source = useWealth();
	const privacy = usePrivacy();
	const shell = useShell();
	const queries = useQueryClient();

	/** The plan opened, the figure being corrected in it, the plan being ended, and the row last acted on. */
	let openId = $state<string | undefined>();
	let editing = $state<PlanField | 'legacy' | undefined>();
	let endId = $state<string | undefined>();
	let touched = $state<string | undefined>();

	const reread = () => queries.invalidateQueries({ queryKey: wealthKeys.all });
	const correct = createMutation(() => ({ ...correctProjectionMutation(source), onSuccess: reread }));
	const change = createMutation(() => ({ ...changePlanMutation(source), onSuccess: reread }));

	const rows = $derived(plans.timeline.rows);
	const opened = $derived(rows.find((r) => r.id === openId));
	const ending = $derived(rows.find((r) => r.id === endId));
	const hasPaused = $derived(rows.some((r) => r.paused));
	const mask = (text: string) => maskAmounts(text, privacy.on);
	const pc = (f: number) => `${String(Math.round(f * 10000) / 100)}%`;

	async function focusRow(id: string) {
		await tick();
		document.getElementById(`plv-open-${id}`)?.focus();
	}

	function open(id: string) {
		correct.reset();
		editing = undefined;
		openId = id;
		touched = id;
	}

	function close() {
		const was = openId;
		openId = undefined;
		editing = undefined;
		correct.reset();
		if (was) void focusRow(was);
	}

	async function save(c: ProjectionCorrection) {
		try {
			await correct.mutateAsync(c);
		} catch {
			return; // the row stays open and says why
		}
		const was = editing;
		editing = undefined;
		await tick();
		if (was) document.getElementById(`plv-fig-${was}`)?.focus();
	}

	async function act(c: PlanChange) {
		touched = c.id;
		try {
			await change.mutateAsync(c);
		} catch {
			return;
		}
		endId = undefined;
		if (c.action === 'end') {
			openId = undefined;
			await tick();
			document.getElementById('plv-summary')?.focus();
		}
	}
</script>

{#snippet legend()}
	<div class="lgd2" aria-hidden="true">
		<span><i class="k-bar k-out"></i>Money out</span>
		<span><i class="k-bar k-in"></i>Money in</span>
		<span><i class="k-dia"></i>Once</span>
		{#if hasPaused}<span><i class="k-hollow"></i>Paused, not counted</span>{/if}
		<span><i class="k-tk"></i>{plans.timeline.each}</span>
		<span><i class="k-step"></i>A change from a date</span>
		<span><i class="k-evt"></i>An event on a record</span>
		<span><i class="k-past"></i>Runs past {plans.timeline.last}</span>
	</div>
{/snippet}

<div class="plv pstack">
	{#if plans.banner}
		<div role="status" class="pstack tight">
			{#key plans.banner.audit}
				<div
					class="okb"
					class:ok-pause={plans.banner.kind === 'pause'}
					class:ok-add={plans.banner.kind === 'resume'}
					class:ok-neutral={plans.banner.kind === 'end'}
				>
					{#if plans.banner.kind === 'pause'}<CirclePause class="lc" aria-hidden="true" />
					{:else if plans.banner.kind === 'resume'}<CirclePlay class="lc" aria-hidden="true" />
					{:else}<CalendarX class="lc" aria-hidden="true" />{/if}
					<span>{plans.banner.text}</span>
				</div>
			{/key}
			<div class="hist aud">
				<ClipboardCheck class="lc" aria-hidden="true" /><span>{mask(plans.banner.audit)}</span>
			</div>
		</div>
	{/if}

	<section class="mp-card sumc" aria-labelledby="plv-summary" data-testid={TestIDs.plansSummary}>
		<div class="rtx">
			<h2 id="plv-summary" class="mp-hl" tabindex="-1">{plans.title}</h2>
			<span class="mp-foot mp-ink2" aria-live="polite">{mask(plans.summary)}</span>
		</div>
		{#if plans.canEdit}
			<button
				type="button"
				class="mp-btn mp-btn-tinted mp-btn-small addc"
				onclick={() => {
					shell.openChat();
				}}
			>
				<MessageCircle class="lc lc-s" aria-hidden="true" />Add in chat
			</button>
		{/if}
	</section>

	<section class="mp-card tl" aria-labelledby="plv-tl" data-testid={TestIDs.plansTimeline}>
		<div class="tlh tlhb">
			<div class="rtx">
				<h2 id="plv-tl" class="mp-hl">{plans.timeline.title}</h2>
				<span class="mp-foot mp-ink2">{plans.timeline.from}</span>
			</div>
			<ChoiceMenu
				kind="corner"
				value={money}
				options={MONEY}
				label="Money: {moneyOf(money).label}. Change it"
				menuLabel="Money"
				testId={TestIDs.projectionMoney}
				onChoose={(id: string) => {
					onMoney(moneyOf(id).id);
				}}
			/>
		</div>
		<div class="tl-axis" aria-hidden="true">
			<span class="tl-sp"></span>
			<div class="mp-chartaxis tl-ax">
				{#each plans.timeline.axis as tickAt (tickAt.label)}
					<span
						class:ax0={tickAt.at === 0}
						class:ax1={tickAt.at === 1}
						class:minor={tickAt.minor === true}
						style:left={pc(tickAt.at)}
					>
						{tickAt.label}
					</span>
				{/each}
			</div>
			<span class="tl-sp"></span>
		</div>
		<ul class="tl-rows">
			{#each rows as r (r.id)}
				<li class="tl-row" class:tl-sel={touched === r.id} class:paused={r.paused}>
					<div class="tl-n">
						<button
							type="button"
							id="plv-open-{r.id}"
							class="tl-open"
							aria-label="Open {r.name}{r.paused ? ', paused, not counted' : ''}"
							aria-haspopup="dialog"
							onclick={() => {
								open(r.id);
							}}
						>
							<span class="mp-icontile"><Icon name={r.icon} small /></span>
							<span class="tl-t">
								<span class="mp-sub mp-w6">{r.name}</span>
								<span class="mp-foot mp-ink2">{mask(r.sub)}</span>
								{#if r.paused}<span class="mp-chip mp-pause rchip">Paused · not counted</span>{/if}
							</span>
						</button>
					</div>
					<!-- the lane: a picture with its words; a click on it reaches the row's open button, stretched over the row -->
					<div class="tl-l" role="img" aria-label={hideAmounts(r.aria, privacy.on)}>
						{#each plans.timeline.grid as g (g)}<span class="tl-g" style:left={pc(g)}></span>{/each}
						{#each r.bars as b, i (i)}
							<span class="tb {b.kind}" style:left={pc(b.from)} style:width={pc(Math.max(b.to - b.from, 0))}></span>
						{/each}
						{#each r.points as m, i (i)}<span class="tm {m.shape}" style:left={pc(m.at)}></span>{/each}
						{#if r.past}<span class="tm past"></span>{/if}
					</div>
					{#if plans.canEdit}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger class="iconbtn tl-m" aria-label="More for {r.name}: open, pause, end, ask in chat">
								<Ellipsis class="lc" aria-hidden="true" />
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content class="pmenu" align="end" sideOffset={4} aria-label="More for {r.name}">
									<DropdownMenu.Item
										class="pmi"
										onSelect={() => {
											open(r.id);
										}}
									>
										<Maximize2 class="lc" aria-hidden="true" />Open the plan
									</DropdownMenu.Item>
									{#if r.paused}
										<DropdownMenu.Item class="pmi" onSelect={() => void act({ id: r.id, action: 'resume' })}>
											<Play class="lc" aria-hidden="true" />Resume
										</DropdownMenu.Item>
									{:else}
										<DropdownMenu.Item class="pmi" onSelect={() => void act({ id: r.id, action: 'pause' })}>
											<Pause class="lc" aria-hidden="true" />Pause
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Item
										class="pmi danger"
										onSelect={() => {
											touched = r.id;
											endId = r.id;
										}}
									>
										<CalendarX class="lc" aria-hidden="true" />End it
									</DropdownMenu.Item>
									<DropdownMenu.Separator class="psep" />
									<DropdownMenu.Item
										class="pmi"
										onSelect={() => {
											shell.openChat();
										}}
									>
										<MessageCircle class="lc" aria-hidden="true" />Ask in chat
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>
					{/if}
				</li>
			{/each}
		</ul>
		<div class="hzchips oncard" role="group" aria-label="Horizon">
			{#each HORIZONS as years (years)}
				<button
					type="button"
					class="hzc"
					class:on={horizon === years}
					aria-pressed={horizon === years}
					onclick={() => {
						onHorizon(years);
					}}
				>
					{years} yrs
				</button>
			{/each}
		</div>
		{@render legend()}
		<p class="pp mp-foot mp-ink2 tlfoot">
			{#if plans.canEdit}<Pencil class="lc" aria-hidden="true" />{:else}<Lock class="lc" aria-hidden="true" />{/if}
			<span>{plans.foot}</span>
		</p>
	</section>

	{#if plans.ended.length > 0}
		<section class="mp-card endc" aria-labelledby="plv-ended">
			<div class="tlh">
				<h2 id="plv-ended" class="mp-hl">Ended</h2>
				<span class="mp-foot mp-ink2">no longer counted; kept in its history</span>
			</div>
			<ul>
				{#each plans.ended as e (e.id)}
					<li class="erow">
						<span class="mp-icontile"><Icon name={e.icon} small /></span>
						<span class="tl-t">
							<span class="mp-sub mp-w6">{e.name}</span>
							<span class="mp-foot mp-ink2">{mask(e.sub)}</span>
						</span>
						<span class="mp-chip mp-neutral">Ended</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<p class="pp mp-foot mp-ink2">{plans.note}</p>
</div>

{#if opened}
	<PlanSheet
		row={opened}
		canEdit={plans.canEdit}
		{editing}
		error={correct.error?.message}
		busy={change.isPending}
		onClose={close}
		onEdit={(part: PlanField | 'legacy') => {
			correct.reset();
			editing = part;
		}}
		onCancelEdit={() => {
			editing = undefined;
			correct.reset();
		}}
		onSave={(c: ProjectionCorrection) => void save(c)}
		onPause={() => void act({ id: opened.id, action: opened.paused ? 'resume' : 'pause' })}
		onEnd={() => {
			endId = opened.id;
		}}
		onAsk={() => {
			close();
			shell.openChat();
		}}
	/>
{/if}

{#if ending}
	<EndDialog
		name={ending.name}
		error={change.error?.message}
		onKeep={() => {
			endId = undefined;
			change.reset();
		}}
		onEnd={(word: string) => void act({ id: ending.id, action: 'end', ...(word ? { word } : {}) })}
	/>
{/if}
