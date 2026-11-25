<script lang="ts">
	// A chart card that could not be read (board Web v4 · Home charts, could not load): it says what is safe and offers
	// Try again; the rest of Home stays as it is. The button is never disabled while it refetches, so focus stays put.
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	let { safe, onRetry }: { safe: string; onRetry: () => void } = $props();
</script>

<div class="hc-msg" role="alert">
	<span class="mp-icontile mp-neutral" aria-hidden="true"><TriangleAlert class="lc lc-s" /></span>
	<div class="hc-msgt">
		<span class="mp-sub mp-w6">This card could not be loaded</span>
		<span class="mp-foot mp-ink2">{safe}</span>
	</div>
	<button type="button" class="mp-btn mp-btn-tinted mp-btn-small" onclick={onRetry}>Try again</button>
</div>
