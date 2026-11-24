<script lang="ts">
	// Home until the first dashboard is built (MA-208, phase 2): the page's head as Shell 1a draws it, and the api's
	// status. The hero, the splits and what is due arrive with MA-208.
	import ApiStatus from './ApiStatus.svelte';
</script>

<div class="mp-pagepad">
	<div class="mp-pagehead">
		<div class="flex flex-col gap-1">
			<h1 id="page-title" class="mp-large">Home</h1>
			<p class="mp-foot mp-ink2">The household's wealth arrives here with the first dashboard (phase 2).</p>
		</div>
	</div>
	<div class="max-w-xl">
		<ApiStatus />
	</div>
	<!-- Development only: the scripted journey on the local stack (MA-198). The production build has none of it, and
	     scripts/web_gates.sh checks that. -->
	{#if import.meta.env.DEV}
		<div class="max-w-xl">
			{#await import('./LocalJourney.svelte') then journey}
				<journey.default />
			{/await}
		</div>
	{/if}
</div>
