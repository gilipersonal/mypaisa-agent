<script lang="ts">
	// Words with amounts in them (MA-262). Each amount is formatted at the door and masked in privacy mode; where the
	// board keeps only the names in privacy mode ("Arun · Asha · Pune rent"), `drop` leaves the amounts out instead.
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import type { Said } from '#lib/wealth/forecast.ts';

	let { parts, drop = false }: { parts: Said[]; drop?: boolean } = $props();
	const privacy = usePrivacy();
	const words = $derived(
		drop && privacy.on ? parts.filter((p) => !p.fig).map((p) => ({ ...p, text: p.text?.replace(/ +$/, '') })) : parts
	);
</script>

{#each words as part, n (n)}{#if part.fig}<Amount fig={part.fig} />{:else}{part.text}{/if}{/each}
