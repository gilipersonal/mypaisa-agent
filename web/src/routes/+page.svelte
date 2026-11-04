<script lang="ts">
	import ApiStatus from '#lib/components/shell/ApiStatus.svelte';
</script>

<svelte:head><title>MyPaisa</title></svelte:head>

<section aria-labelledby="overview-title" class="mx-auto flex w-full max-w-3xl flex-col gap-6">
	<h1 id="overview-title" class="font-display text-3xl font-extrabold tracking-tight">Overview</h1>
	<p class="text-muted-foreground">
		The household's wealth arrives here with phase 2. For now the shell, the theme and the api are in place.
	</p>
	<ApiStatus />
	<!-- Development only: the scripted journey on the local stack (MA-198). The production build has none of it, and
	     scripts/web_gates.sh checks that. -->
	{#if import.meta.env.DEV}
		{#await import('#lib/components/shell/LocalJourney.svelte') then journey}
			<journey.default />
		{/await}
	{/if}
</section>
