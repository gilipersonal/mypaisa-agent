<script lang="ts">
	// One amount, with the words that travel with it ("▲ £5,000", "£347 a month"), formatted at the door from its
	// decimal string. In privacy mode it is the mask, and a screen reader hears "hidden", never the figure.
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { maskedMoney } from '#lib/privacy/mask.ts';
	import type { Fig } from '#lib/wealth/overview.ts';

	let { fig }: { fig: Fig } = $props();
	const privacy = usePrivacy();
	const text = $derived(
		`${fig.pre ?? ''}${maskedMoney(fig.amount, fig.currency, privacy.on, { whole: true })}${fig.post ?? ''}`
	);
</script>

{#if privacy.on}<span role="img" aria-label="hidden">{text}</span>{:else}{text}{/if}
