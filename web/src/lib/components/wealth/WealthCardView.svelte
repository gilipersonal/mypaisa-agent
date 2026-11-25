<script lang="ts">
	// One card of a wealth page: its title, the quiet words at the right, then its parts. Home's two chart cards
	// (MA-359; board Web v4 · Home charts) are cards of their own: each reads its own query, so it loads, fails and
	// empties by itself, and draws its whole card.
	import InvestedOwedCard from '#lib/components/home/charts/InvestedOwedCard.svelte';
	import OwnOweCard from '#lib/components/home/charts/OwnOweCard.svelte';
	import type { WealthCard } from '#lib/wealth/overview.ts';
	import Amount from './Amount.svelte';
	import CardParts from './CardParts.svelte';

	let { card, onStart }: { card: WealthCard; onStart?: ((id: string) => void) | undefined } = $props();
	const chart = $derived(card.parts.find((p) => p.kind === 'ownowe' || p.kind === 'investedowed'));
</script>

{#if chart?.kind === 'ownowe'}
	<OwnOweCard {card} view={chart.view} currency={chart.currency} {onStart} />
{:else if chart?.kind === 'investedowed'}
	<InvestedOwedCard {card} view={chart.view} currency={chart.currency} {onStart} />
{:else}
	<section class="mp-card cpad" aria-labelledby="card-{card.id}">
		<div class="ctl">
			<h2 id="card-{card.id}" class="mp-hl">{card.title}</h2>
			<span class="mp-foot mp-ink2">
				{#if card.asideFig}<Amount fig={card.asideFig} />{/if}
				{card.aside}
			</span>
		</div>
		<CardParts parts={card.parts} {onStart} />
	</section>
{/if}
