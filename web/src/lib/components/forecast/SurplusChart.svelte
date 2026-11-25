<script lang="ts">
	// The surplus chart (board 1a): each year's leanest month as a bar against the floor, the years below it in crimson
	// with ▼, the years past the plot's bounds broken, and in retirement grey with no floor. HTML bars, as DS v1's charts
	// are. Picking a year is a slider over the plot, unseen: a click on a bar or the arrow keys choose the year the
	// cards below show. In privacy mode the axis's amounts are the mask, the bars keep their shape; a screen reader gets
	// the chart's sentence and a table of the years.
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { maskedMoney } from '#lib/privacy/mask.ts';
	import type { ForecastChart } from '#lib/wealth/forecast.ts';
	import type { DisplayCurrency } from '#lib/wealth/overview.ts';

	let {
		chart,
		currency,
		selected,
		onSelect
	}: {
		chart: ForecastChart;
		currency: DisplayCurrency;
		selected: number;
		onSelect: (year: number) => void;
	} = $props();
	const privacy = usePrivacy();

	const pct = (f: number) => `${(f * 100).toFixed(2)}%`;
	const index = $derived(
		Math.max(
			0,
			chart.bars.findIndex((b) => b.year === selected)
		)
	);
	const reading = $derived(chart.bars[index]);
	const mask = $derived(maskedMoney('0', currency, true));
	/** A bar under the zero line grows down from it. */
	const zeroAt = $derived(chart.grid.find((g) => g.kind === 'zero')?.at ?? 0);

	function pick(event: Event) {
		const bar = chart.bars[Number((event.currentTarget as HTMLInputElement).value)];
		if (bar) onSelect(bar.year);
	}
</script>

<div class="bch" class:wide={chart.wide} style:--cols={chart.bars.length}>
	<div role="img" aria-label={privacy.on ? chart.ariaPrivate : chart.aria}>
		<div class="bplot" aria-hidden="true">
			{#each chart.grid as g (g.kind + g.label)}
				<span class="bgl {g.kind}" style:bottom={pct(g.at)}></span>
				<span class="byl {g.kind}" style:bottom={pct(g.at)}>{privacy.on ? mask : g.label}</span>
			{/each}
			<div class="bcols">
				{#each chart.bars as b, i (b.year)}
					<div class="bc">
						{#if b.floorAt !== undefined}<span class="ftk" style:bottom={pct(b.floorAt)}></span>{/if}
						<span
							class="bb {b.tone}"
							class:sel={b.year === selected}
							class:cap={b.capTop}
							class:capb={b.capFoot}
							class:neg={b.to <= zeroAt}
							style:bottom={pct(b.from)}
							style:height={pct(b.to - b.from)}
							style:--i={i}
						></span>
					</div>
				{/each}
			</div>
		</div>
		<div class="bflags" aria-hidden="true">
			{#each chart.bars as b (b.year)}<span>{b.tone === 'lo' ? '▼' : ''}</span>{/each}
		</div>
		{#if chart.cashStrip}
			<div class="cstrip" aria-hidden="true">
				{#each chart.bars as b (b.year)}<span class:neg={b.cashBelow}></span>{/each}
			</div>
		{/if}
		<div class="mp-chartaxis" aria-hidden="true">
			{#each chart.axis as tick (tick.label)}
				<span style:left={pct(tick.at)}>{tick.label}</span>
			{/each}
		</div>
	</div>
	<input
		class="bsel"
		type="range"
		min="0"
		max={chart.bars.length - 1}
		step="1"
		value={index}
		aria-label="The year shown below"
		aria-valuetext={reading ? (privacy.on ? reading.ariaPrivate : reading.aria) : undefined}
		oninput={pick}
	/>
	<table class="sr-only">
		<caption>Each year’s leanest month against the floor</caption>
		<thead>
			<tr>
				<th scope="col">Year</th>
				<th scope="col">Leanest month</th>
				<th scope="col">Against the floor</th>
			</tr>
		</thead>
		<tbody>
			{#each chart.bars as b (b.year)}
				<tr>
					<th scope="row">{b.year}</th>
					<td><Amount fig={b.fig} /></td>
					<td>
						{b.tone === 'lo' ? 'Below it' : b.tone === 'rt' ? 'No floor: retired' : 'At or above it'}{b.cashBelow
							? '; cash below zero'
							: ''}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
