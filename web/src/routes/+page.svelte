<script lang="ts">
	import HomePage from '#lib/components/home/HomePage.svelte';

	// Development only (MA-198): /?local shows the api's status and the scripted journey on the local stack under
	// Home. The production build has none of it, and scripts/web_gates.sh checks that.
	const local = import.meta.env.DEV && new URLSearchParams(window.location.search).has('local');
</script>

<svelte:head><title>Home · MyPaisa</title></svelte:head>

<HomePage />
{#if local}
	<div class="mp-pagepad">
		{#await import('#lib/components/shell/ApiStatus.svelte') then status}
			<status.default />
		{/await}
		{#await import('#lib/components/shell/LocalJourney.svelte') then journey}
			<journey.default />
		{/await}
	</div>
{/if}
