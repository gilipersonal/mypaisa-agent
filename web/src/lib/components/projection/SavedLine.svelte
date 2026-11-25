<script lang="ts">
	// What a card shows once a correction is kept (boards P5 and P6, saved): that it is saved, and the audit row's own
	// line. In privacy mode the line's amounts are hidden with the rest.
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { maskAmounts } from '#lib/privacy/mask.ts';
	import type { Saved } from '#lib/wealth/projection.ts';

	let { saved }: { saved: Saved } = $props();
	const privacy = usePrivacy();
</script>

<div role="status">
	{#key saved.audit}
		<div class="saved"><CircleCheck class="lc" aria-hidden="true" />{saved.text}</div>
	{/key}
	<div class="audit">
		<ClipboardCheck class="lc" aria-hidden="true" /><span>{maskAmounts(saved.audit, privacy.on)}</span>
	</div>
</div>
