<script lang="ts">
	import '../app.css';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { isDoor } from '#lib/auth/guard.ts';
	import { browserStorage } from '#lib/auth/session.ts';
	import AppShell from '#lib/components/shell/AppShell.svelte';
	import { applyAppearance, readAppearance } from '#lib/components/shell/appearance.ts';
	import { createQueryClient } from '#lib/query/client.ts';

	let { children }: { children: Snippet } = $props();
	const queryClient = createQueryClient();

	// The sign-in and join pages (MA-185, 1b) are drawn without the shell; they keep the appearance chosen in this
	// browser, which the shell applies everywhere else.
	const door = $derived(isDoor(page.url.pathname));
	$effect(() => {
		if (door) applyAppearance(document.documentElement, readAppearance(browserStorage()));
	});

	// Signing in, the page gives way to Home in one cross-fade (1b, "How it lands"; its timing is in auth.css).
	onNavigate((nav) => {
		const from = nav.from?.url.pathname;
		const to = nav.to?.url.pathname;
		if (!from || !to || !isDoor(from) || isDoor(to) || !('startViewTransition' in document)) return;
		return new Promise<void>((ready) => {
			document.startViewTransition(async () => {
				ready();
				await nav.complete;
			});
		});
	});
</script>

<QueryClientProvider client={queryClient}>
	{#if door}
		{@render children()}
	{:else}
		<AppShell>
			{@render children()}
		</AppShell>
	{/if}
</QueryClientProvider>
