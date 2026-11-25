<script lang="ts">
	// One card of a wealth page: its title, the quiet words at the right, then its parts.
	import type { WealthCard } from '#lib/wealth/overview.ts';
	import Amount from './Amount.svelte';
	import CardParts from './CardParts.svelte';

	let { card, onStart }: { card: WealthCard; onStart?: ((id: string) => void) | undefined } = $props();
</script>

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
