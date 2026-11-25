<script lang="ts">
	// A plan card (MA-222; board Web v4 · Plans in the chat, 2a a card per step): the questions, one card with a row of
	// chips for each; the impact from the engine with its own Confirm, Change and Cancel; the plan saved, collapsed in
	// place with its audit row; or a refusal with a lock. Every amount in its words is masked in privacy mode, the
	// chart's grid labels with them, and a screen reader hears the chart as words.
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Lock from '@lucide/svelte/icons/lock';
	import type { PlanBars, PlanCard } from '#lib/cards/plan.ts';
	import type { CardAction } from '#lib/chat/transport.ts';
	import { hideAmounts, maskAmounts } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';

	let {
		card,
		privacy = false,
		onChoose,
		onTap
	}: {
		card: PlanCard;
		privacy?: boolean;
		/** A chip of one of the card's questions: "<question>:<chip>". */
		onChoose: (chipId: string) => void;
		onTap: (action: CardAction) => void;
	} = $props();

	const body = $derived(card.body);
	const mask = (t: string) => maskAmounts(t, privacy);
	const LABEL: Record<CardAction, string> = { confirm: 'Confirm', edit: 'Change', cancel: 'Cancel' };
	const pc = (f: number) => `${String(Math.round(f * 10000) / 100)}%`;

	/** The chart's geometry from its amounts: where each bar and the before line sit, as shares of the plot. */
	function plot(b: PlanBars) {
		const max = Number(b.max);
		const min = Number(b.min);
		const y = (v: number) => (max - v) / (max - min);
		const zero = y(0);
		const n = b.values.length;
		const slot = 1 / n;
		const bars = b.values.map((v, i) => {
			const value = Number(v);
			const top = value >= 0 ? y(value) : zero;
			return {
				left: i * slot + slot * 0.2,
				width: slot * 0.6,
				top,
				height: Math.abs(y(value) - zero),
				neg: value < 0,
				flag: b.flagged[i] === true
			};
		});
		const line = b.before.map((v, i) => `${((i + 0.5) * slot * 100).toFixed(2)},${(y(Number(v)) * 100).toFixed(2)}`);
		return {
			bars,
			zero: zero * 100,
			marks: bars.filter((r) => r.flag).map((r) => ({ left: r.left + r.width / 2, top: r.neg ? zero : r.top })),
			line: `M${line.join(' L')}`,
			grid: b.grid.map((g) => ({ top: y(Number(g.amount)), label: g.label }))
		};
	}
</script>

<div class="cc pk" role="group" aria-label={body.title} data-testid={TestIDs.chatPlanCard}>
	<div class="cc-h">
		{#if body.done}
			<span class="mp-over pk-done flex items-center gap-1">
				<CircleCheck class="lc" aria-hidden="true" />{body.over}
			</span>
		{:else}
			<span class="mp-over mp-ink2">{body.over}</span>
		{/if}
		<span class="mp-hl">{mask(body.title)}</span>
		{#if body.sub}<span class="mp-sub mp-ink2">{mask(body.sub)}</span>{/if}
	</div>
	{#if body.blocks.length > 0}
		<div class="pk-b">
			{#each body.blocks as block, i (i)}
				{#if block.kind === 'kv'}
					<div class="kv"><span>{block.k}</span><span class="tnum">{mask(block.v)}</span></div>
				{:else if block.kind === 'q'}
					<div class="pk-q" role="group" aria-label={block.q}>
						<span class="pk-ql">{block.q}</span>
						<div class="pk-chips">
							{#each block.chips as chip (chip.id)}
								{@const chosen = block.chosen === chip.id}
								<button
									type="button"
									class="pk-chip"
									class:on={chosen}
									aria-pressed={chosen}
									onclick={() => {
										onChoose(`${block.id}:${chip.id}`);
									}}
								>
									{chip.label}
								</button>
							{/each}
						</div>
					</div>
				{:else if block.kind === 'sec'}
					<div class="pk-sec">
						<span class="mp-over mp-ink2">{block.t}</span>
						{#if block.r}<span class="mp-foot mp-ink2">{block.r}</span>{/if}
					</div>
				{:else if block.kind === 'mp3'}
					<div class="pk-mp3">
						{#each block.rows as r (r.y)}
							<div>
								<span class="mp-foot mp-ink2">{r.y}</span>
								<span class="pk-v3">{mask(r.v)}</span>
								<span
									class="mp-foot tnum"
									class:down={r.dir === 'down'}
									class:up={r.dir === 'up'}
									class:mp-ink2={r.dir === 'same'}
								>
									{mask(r.chg)}
								</span>
							</div>
						{/each}
					</div>
				{:else if block.kind === 'foot'}
					<p class="pp mp-foot mp-ink2 tnum">{mask(block.t)}</p>
				{:else if block.kind === 'flag'}
					<div class="pk-flag" role="note"><span>{mask(block.t)}</span></div>
				{:else if block.kind === 'ok'}
					<div class="pk-ok"><CircleCheck class="lc" aria-hidden="true" /><span>{mask(block.t)}</span></div>
				{:else if block.kind === 'lock'}
					<div class="pk-lock"><Lock class="lc" aria-hidden="true" /><span>{mask(block.t)}</span></div>
				{:else if block.kind === 'aud'}
					<p class="pp mp-foot mp-ink2 pk-aud">{mask(block.t)}</p>
				{:else}
					{@const p = plot(block)}
					<div class="pk-bw">
						<div class="pk-bars" role="img" aria-label={hideAmounts(block.aria, privacy)}>
							<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
								{#each p.grid as g (g.label)}
									<line class="fgrid" x1="0" x2="100" y1={g.top * 100} y2={g.top * 100}></line>
								{/each}
								<line class="pk-zero" x1="0" x2="100" y1={p.zero} y2={p.zero}></line>
								<path class="pk-before" d={p.line}></path>
							</svg>
							{#if !privacy}
								{#each p.grid as g (g.label)}<span class="gy" style:top={pc(g.top)}>{g.label}</span>{/each}
							{/if}
							{#each p.bars as r, j (j)}
								<span
									class="pk-bar"
									class:neg={r.neg}
									class:flag={r.flag}
									style:left={pc(r.left)}
									style:width={pc(r.width)}
									style:top={pc(r.top)}
									style:height={pc(r.height)}
								></span>
							{/each}
							{#each p.marks as m, j (j)}
								<span class="pk-fm" style:left={pc(m.left)} style:top={pc(m.top)} aria-hidden="true">▼</span>
							{/each}
						</div>
						<div class="mp-chartaxis" aria-hidden="true">
							{#each block.axis as a (a.label)}
								<span class:ax0={a.at === 0} class:ax1={a.at === 1} style:left={pc(a.at)}>{a.label}</span>
							{/each}
						</div>
					</div>
					<div class="lgd" aria-hidden="true">
						<span><i class="sw-bar"></i>{block.legend.bar}</span>
						<span><i class="sw-dash"></i>{block.legend.line}</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
	{#if body.audit}
		<div class="pk-tech"><span>{mask(body.audit)}</span></div>
	{/if}
	{#if body.acts && body.acts.length > 0}
		<div class="pk-acts">
			{#each body.acts as act (act)}
				<button
					type="button"
					class="mp-btn mp-btn-small"
					class:mp-btn-primary={act === 'confirm'}
					class:mp-btn-tinted={act === 'edit'}
					class:mp-btn-plain={act === 'cancel'}
					onclick={() => {
						onTap(act);
					}}
				>
					{LABEL[act]}
				</button>
			{/each}
		</div>
	{/if}
	{#if body.tech}
		<details class="pk-fold" open={body.tech.open}>
			<summary>{body.tech.label}<ChevronDown class="lc" aria-hidden="true" /></summary>
			<div class="pk-tech">
				{#each body.tech.lines as line (line)}<span>{mask(line)}</span>{/each}
			</div>
		</details>
	{/if}
</div>
