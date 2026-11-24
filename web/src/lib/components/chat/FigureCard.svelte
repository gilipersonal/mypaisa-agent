<script lang="ts">
	// A figure from the engine (board 2a): never from the model. Its source sits under it.
	import type { FigureCard } from '#lib/cards/kinds.ts';
	import { maskedMoney } from '#lib/privacy/mask.ts';

	let { card, privacy = false }: { card: FigureCard; privacy?: boolean } = $props();
	const body = $derived(card.body);
	const value = $derived(maskedMoney(body.value.amount, body.value.currency, privacy, { whole: true }));
	const was = $derived(
		body.was
			? `It was ${maskedMoney(body.was.value.amount, body.was.value.currency, privacy, { whole: true })} ${body.was.why}`
			: ''
	);
</script>

<div class="cc cc-fig">
	<span class="mp-over mp-ink2">{body.over}</span>
	<span class="mp-num-l">{value}</span>
	{#if was}<span class="mp-foot mp-ink2">{was}</span>{/if}
</div>
<span class="aimeta">{body.source}</span>
