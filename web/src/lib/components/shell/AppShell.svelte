<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:min-h-11 focus:px-4 focus:py-3"
	>Skip to content</a
>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
		<div class="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
			<img src="/icons/icon.svg" alt="" class="size-8 rounded-lg" />
			<span class="font-display text-lg font-extrabold">MyPaisa</span>
		</div>
	</header>

	<main id="main" tabindex="-1" class="flex-1 px-4 py-8 outline-none">
		{@render children()}
	</main>
</div>
