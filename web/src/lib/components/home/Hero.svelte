<script module lang="ts">
	import { RollOnce } from '#lib/wealth/fresh.ts';

	// One memory for the page's life in this tab: a change rolls once, not again on coming back to Home.
	const once = new RollOnce();
</script>

<script lang="ts">
	// The hero (board 1a): net worth in pounds or rupees, what last moved it, and the rate with its day. When a
	// confirmed change lands, the figure rolls from the old total to the new one and "Just now" pops once; under Reduce
	// Motion the new figure simply stands. An empty household gets words, never £0.
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import type { Decimal } from '#lib/formatting/money.ts';
	import { maskAmounts } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import { JUST_NOW_MS, isJustNow, rollAt } from '#lib/wealth/fresh.ts';
	import type { DisplayCurrency, Hero } from '#lib/wealth/overview.ts';

	let {
		hero,
		currency,
		onCurrency
	}: { hero: Hero; currency: DisplayCurrency; onCurrency: (currency: DisplayCurrency) => void } = $props();

	const privacy = usePrivacy();
	let rolling = $state<Decimal | undefined>();
	let now = $state(new Date());
	const justNow = $derived(isJustNow(hero.changedAt, now));

	// "Just now" lasts a minute from the change, wherever the member was when it landed.
	$effect(() => {
		const at = hero.changedAt;
		if (!at) return;
		now = new Date();
		const left = JUST_NOW_MS - (Date.now() - new Date(at).getTime());
		if (left <= 0) return;
		const timer = setTimeout(() => (now = new Date()), left + 50);
		return () => {
			clearTimeout(timer);
		};
	});

	$effect(() => {
		const { changedAt, rollFrom, net } = hero;
		if (!net || rollFrom === undefined || !once.shouldRoll(changedAt, new Date())) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const start = performance.now();
		let frame = 0;
		const step = (t: number) => {
			const value = rollAt(rollFrom, net.amount, t - start);
			rolling = value === net.amount ? undefined : value;
			if (rolling !== undefined) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(frame);
			rolling = undefined;
		};
	});
</script>

<section class="mp-hero hero" aria-label="Net worth" data-testid={TestIDs.homeHero}>
	<div class="flex items-center justify-between gap-3">
		<span class="mp-over mp-hero-2">{hero.over}</span>
		<div class="mp-seg ccy" role="group" aria-label="Show amounts in">
			<button
				type="button"
				class="mp-seg-i seg-s"
				class:on={currency === 'GBP'}
				aria-label="Pounds"
				aria-pressed={currency === 'GBP'}
				onclick={() => {
					onCurrency('GBP');
				}}
			>
				£ GBP
			</button>
			<button
				type="button"
				class="mp-seg-i seg-s"
				class:on={currency === 'INR'}
				aria-label="Rupees"
				aria-pressed={currency === 'INR'}
				onclick={() => {
					onCurrency('INR');
				}}
			>
				₹ INR
			</button>
		</div>
	</div>
	{#if hero.net}
		<div class="flex flex-wrap items-center gap-3">
			<span class="mp-num-hero nowrap" aria-hidden={rolling !== undefined && !privacy.on}>
				<Amount fig={{ ...hero.net, amount: rolling ?? hero.net.amount }} />
			</span>
			{#if justNow}<span class="mp-chip upchip justnow">Just now</span>{/if}
		</div>
		<div class="hsub" aria-live="polite">
			{#if hero.delta}<span class="mp-sub mp-w6 hup"><Amount fig={hero.delta} /></span>{/if}
			<span class="mp-sub mp-hero-2">{maskAmounts(hero.line, privacy.on)}</span>
		</div>
	{:else}
		<span class="hempty">Nothing here yet</span>
		<span class="mp-sub mp-hero-2">{hero.line}</span>
	{/if}
	<div class="rate mp-foot mp-hero-2">
		<ArrowLeftRight class="lc lc-s" aria-hidden="true" /><span>{hero.rate}</span>
	</div>
</section>
