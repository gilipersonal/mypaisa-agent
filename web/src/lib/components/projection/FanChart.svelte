<script lang="ts">
	// The fan (board 1a): the band where 8 in 10 runs land and the middle path through it, drawn by LayerChart from the
	// view model's years; the gridlines' amounts, the end figures, the milestones' marks and the axis are HTML over it,
	// as DS v1's charts are. A hover, a tap or the arrow keys read the fan at a year. In privacy mode every amount is
	// the mask, the shape stays, and the reading is off; a screen reader gets the board's sentence and a table of the
	// years, hidden amounts and all.
	import { Area, Chart, Rule, Spline, Svg } from 'layerchart/svg';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { maskedMoney } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { Fan } from '#lib/wealth/projection.ts';
	import { across, down, endLabels, fanRows, indexAt, placeMarks, scrubAt } from './fan.ts';

	let { fan }: { fan: Fan } = $props();
	const privacy = usePrivacy();

	const rows = $derived(fanRows(fan));
	const marks = $derived(placeMarks(fan));
	const ends = $derived(endLabels(fan));

	// The year being read: a pointer over the plot, or the slider's own value once it is tapped, dragged or focused.
	let hover = $state<number | undefined>();
	let held = $state(false);
	let value = $state(0);
	const middle = $derived(Math.round(fan.years / 2));
	const index = $derived(held ? Math.min(value, fan.years) : hover);
	const scrub = $derived(privacy.on || index === undefined ? undefined : scrubAt(fan, index));
	const reading = $derived(scrubAt(fan, Math.min(value, fan.years)));

	function onpointermove(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
		hover = indexAt((event.clientX - box.left) / box.width, fan.years);
	}

	function hold() {
		if (!held) value = hover ?? middle;
		held = true;
	}

	const money = (amount: string) => maskedMoney(amount, fan.currency, privacy.on, { whole: true });
</script>

<div class="fanw onhero" data-testid={TestIDs.projectionFan}>
	<div class="mp-chartbox fanbox">
		<div class="fanimg" role="img" aria-label={privacy.on ? fan.ariaPrivate : fan.aria}>
			<div class="fanplot" aria-hidden="true">
				<Chart data={rows} x="at" y="mid" xDomain={[0, fan.years]} yDomain={[0, Number(fan.max)]} padding={0}>
					<Svg aria-hidden="true" role="presentation">
						{#each fan.lines as line (line.amount)}
							<Rule y={Number(line.amount)} class="fgrid" />
						{/each}
						<Area y0="low" y1="high" class="fband" />
						<Spline y="mid" class="fline" />
					</Svg>
				</Chart>
			</div>
			{#each fan.lines as line (line.amount)}
				<span class="gy" style:top={down(fan, line.amount)} aria-hidden="true">
					{privacy.on ? money(line.amount) : line.label}
				</span>
			{/each}
			{#each marks.ticks as tick (tick.id)}
				<span class="mtk" style:left={tick.left} aria-hidden="true"></span>
			{/each}
			{#each marks.dots as dot (dot.id)}
				<span class="mp-chartdot" style:left={dot.left} style:top={dot.top} aria-hidden="true"></span>
			{/each}
			{#each marks.squares as square (square.id)}
				<span class="mp-chartdot pdot" style:left={square.left} style:top={square.top} aria-hidden="true"></span>
			{/each}
			{#each marks.pills as pill (pill.id)}
				<span class="mp-chartlbl pill" style:left={pill.left} style:top={pill.top} aria-hidden="true">
					{pill.label}
				</span>
			{/each}
			{#each ends as end (end.id)}
				<span class="mp-chartlbl le" class:lbl-2={end.quiet} style:top={end.top} aria-hidden="true">
					{money(end.fig.amount)}
				</span>
			{/each}
		</div>

		{#if !privacy.on}
			<input
				class="fscrub"
				type="range"
				min="0"
				max={fan.years}
				step="1"
				bind:value
				aria-label="Read the fan at a year"
				aria-valuetext={reading
					? `${reading.year}: middle path ${money(reading.mid.amount)}; 8 in 10 runs between ${money(reading.low.amount)} and ${money(reading.high.amount)}`
					: undefined}
				{onpointermove}
				onpointerleave={() => (hover = undefined)}
				oninput={hold}
				onfocus={hold}
				onblur={() => (held = false)}
			/>
		{/if}
		{#if scrub}
			<span class="scl" style:left={scrub.left} aria-hidden="true"></span>
			<span class="mp-chartdot sdot" style:left={scrub.left} style:top={scrub.topHigh} aria-hidden="true"></span>
			<span class="mp-chartdot sdot" style:left={scrub.left} style:top={scrub.topLow} aria-hidden="true"></span>
			<span
				class="sct"
				class:tap={held}
				class:flip={scrub.flip}
				style:left={scrub.flip ? undefined : scrub.left}
				style:right={scrub.flip ? scrub.right : undefined}
				aria-hidden="true"
			>
				<b>{scrub.year}</b>
				<span>Middle path <b><Amount fig={scrub.mid} /></b></span>
				<span class="mp-hero-2">8 in 10: <Amount fig={scrub.low} /> to <Amount fig={scrub.high} /></span>
			</span>
		{/if}
	</div>
	<div class="mp-chartaxis" aria-hidden="true">
		{#each fan.axis as tick, n (tick.label)}
			<span
				class:ax0={n === 0}
				class:ax1={n === fan.axis.length - 1}
				class:minor={tick.minor}
				style:left={across(fan, tick.at * fan.years)}
			>
				{tick.label}
			</span>
		{/each}
	</div>

	<table class="sr-only">
		<caption>Net worth each year: the middle path, and where 8 in 10 of the engine’s runs land</caption>
		<thead>
			<tr>
				<th scope="col">Year</th>
				<th scope="col">8 in 10 runs, from</th>
				<th scope="col">Middle path</th>
				<th scope="col">8 in 10 runs, to</th>
			</tr>
		</thead>
		<tbody>
			{#each fan.points as point, n (point.year)}
				<tr>
					<th scope="row">{n === 0 ? `Today, ${String(point.year)}` : point.year}</th>
					<td><Amount fig={{ amount: point.low, currency: fan.currency }} /></td>
					<td><Amount fig={{ amount: point.mid, currency: fan.currency }} /></td>
					<td><Amount fig={{ amount: point.high, currency: fan.currency }} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
