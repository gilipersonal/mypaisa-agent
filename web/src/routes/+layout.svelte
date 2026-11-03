<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import { createQueryClient } from '#lib/query/client.ts';

	let { children }: { children: Snippet } = $props();
	const queryClient = createQueryClient();
</script>

<QueryClientProvider client={queryClient}>
	<AppShell>
		{@render children()}
	</AppShell>
</QueryClientProvider>
