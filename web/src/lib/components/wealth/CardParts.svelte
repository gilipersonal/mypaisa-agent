<script lang="ts">
	// A wealth card's parts, as board 1a draws each: meters, the stacked bar with its legend, dated rows, run-off bars
	// on one time axis, record rows, a list that starts a conversation, a line of text and a link. Bars keep their
	// proportions in privacy mode; only the amounts are masked.
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import NavIcon from '#lib/components/shell/NavIcon.svelte';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { hideAmounts } from '#lib/privacy/mask.ts';
	import type { Part } from '#lib/wealth/overview.ts';
	import Amount from './Amount.svelte';

	let { parts, onStart }: { parts: Part[]; onStart?: ((id: string) => void) | undefined } = $props();
	const privacy = usePrivacy();
	const pc = (share: number) => `${String(Math.round(share * 1000) / 10)}%`;
</script>

{#each parts as part, i (i)}
	{#if part.kind === 'meters'}
		<div class="mrows">
			{#each part.items as it (it.label)}
				<div>
					<div class="flex items-center justify-between gap-2">
						<span class="mp-sub mp-w6">{it.label}</span>
						<span class="mp-sub mp-w6 nowrap"><Amount fig={it.fig} /></span>
					</div>
					<div class="mp-track mbar" role="img" aria-label={hideAmounts(it.aria, privacy.on)}>
						<span class="tone-{it.tone}" style:width={pc(it.share)}></span>
					</div>
					<div class="mp-foot mp-ink2">
						{it.note}
						{#if it.noteFig}<Amount fig={it.noteFig} />{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else if part.kind === 'stack'}
		<div>
			<div class="stk mp-track" role="img" aria-label={part.aria}>
				{#each part.items as it (it.label)}
					<span class="tone-{it.tone}" style:width={pc(it.share)}></span>
				{/each}
			</div>
			<div class="lrows">
				{#each part.items as it (it.label)}
					<div class="lrow">
						<span class="sw tone-{it.tone}"></span>
						<div class="rtx">
							<div class="mp-sub mp-w6">{it.label}</div>
							<div class="mp-foot mp-ink2">
								{it.note}
								{#if it.noteFig}<Amount fig={it.noteFig} />{/if}
								{it.noteAfter ?? ''}
							</div>
						</div>
						<div class="mp-sub mp-w6 tr nowrap"><Amount fig={it.fig} /></div>
					</div>
				{/each}
			</div>
		</div>
	{:else if part.kind === 'due'}
		<div class="drows">
			{#each part.items as it (it.id)}
				<div class="drow" class:moved={it.done}>
					<div class="dtile" class:today={it.today}>
						<span class="mp-cap mp-w6">{it.weekday}</span>
						<span class="mp-t3">{it.day}</span>
						<span class="mp-cap">{it.month}</span>
						{#if it.year}<span class="mp-cap">{it.year}</span>{/if}
					</div>
					<div class="rtx">
						<div class="mp-sub mp-w6">{it.title}</div>
						<div class="mp-foot mp-ink2">
							{it.note}
							{#if it.noteFig}<Amount fig={it.noteFig} />{/if}
						</div>
					</div>
					<div class="tr">
						{#if it.fig}<div class="mp-sub mp-w6 nowrap"><Amount fig={it.fig} /></div>{/if}
						<span class="mp-chip chip-s mp-{it.chip.tone}">{it.chip.text}</span>
					</div>
				</div>
			{/each}
		</div>
	{:else if part.kind === 'runoff'}
		<div class="rorows">
			{#each part.items as it (it.id)}
				<div>
					<div class="flex items-center justify-between gap-2">
						<span class="mp-sub mp-w6 clip">{it.name}</span>
						<span class="mp-sub mp-w6 nowrap"><Amount fig={it.fig} /></span>
					</div>
					<div class="mp-track rotk" role="img" aria-label={it.aria}>
						<span class="tone-meter" style:width={pc(it.share)}></span>
					</div>
					<div class="mp-foot mp-ink2 flex justify-between gap-2">
						<span>
							{it.note}
							{#if it.noteFig}<Amount fig={it.noteFig} />{/if}
						</span>
						<span class="nowrap">{it.ends}</span>
					</div>
				</div>
			{/each}
			{#if part.axis.length > 0}
				<div class="mp-chartaxis roax" aria-hidden="true">
					{#each part.axis as tick, n (tick.label)}
						<span class:ax0={n === 0} class:ax1={n === part.axis.length - 1} style:left={pc(tick.at)}>
							{tick.label}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{:else if part.kind === 'rows'}
		<div class="rows">
			{#each part.items as it (it.id)}
				<div class="rrow">
					<span class="mp-row-lead mp-neutral" aria-hidden="true">{it.lead}</span>
					<div class="rtx">
						<div class="mp-sub mp-w6 clip">{it.name}</div>
						<div class="mt-0.5 flex flex-wrap items-center gap-1.5">
							<span class="mp-chip chip-s mp-neutral">{it.place}</span>
							{#if it.joint}<span class="mp-chip chip-s mp-hold">{it.joint}</span>{/if}
							<span class="mp-foot mp-ink2">{it.note}</span>
						</div>
					</div>
					<div class="tr">
						<div class="mp-sub mp-w6 nowrap"><Amount fig={it.fig} /></div>
						{#if it.alt}<div class="mp-foot mp-ink2 nowrap"><Amount fig={it.alt} /></div>{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else if part.kind === 'list'}
		<div class="lrows">
			{#each part.items as it (it.id)}
				<button type="button" class="lrow" onclick={() => onStart?.(it.id)}>
					<span class="mp-icontile mp-neutral"><NavIcon name={it.icon} small /></span>
					<span class="rtx">
						<span class="mp-sub mp-w6 block">{it.title}</span>
						<span class="mp-foot mp-ink2 block">{it.note}</span>
					</span>
					<span class="mp-foot mp-acc nowrap">{it.action}</span>
				</button>
			{/each}
		</div>
	{:else if part.kind === 'text'}
		<p class="mp-foot mp-ink2 pp">
			{part.text}
			{#if part.fig}<Amount fig={part.fig} />{/if}
			{part.after ?? ''}
		</p>
	{:else}
		<a class="mp-btn mp-btn-plain mp-btn-small lnk" href={resolve(part.href)}>
			{part.text}<ChevronRight class="lc lc-s" aria-hidden="true" />
		</a>
	{/if}
{/each}
