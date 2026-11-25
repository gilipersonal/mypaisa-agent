<script lang="ts">
	// The Chat tab (MA-199): under 600 px the shell shows the chat in place of the page. From 600 px the chat is a sheet
	// centred over the page (MA-357), so this address shows Home with the sheet open.
	import HomePage from '#lib/components/home/HomePage.svelte';
</script>

<svelte:head><title>Chat · MyPaisa</title></svelte:head>

<HomePage />
