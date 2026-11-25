<script lang="ts">
	// More (Arun, 5 Nov 2026, MA-334): under 1024 px the tab bar holds Chat, Home, Assets and Projection, and every
	// other page is one tap from here. From 1024 px the sidebar lists them all, and this page is the same list.
	import { resolve } from '$app/paths';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import NavIcon from '#lib/components/shell/NavIcon.svelte';
	import { MORE_PAGES } from '#lib/components/shell/nav.ts';
</script>

<svelte:head><title>More · MyPaisa</title></svelte:head>

<div class="mp-pagepad">
	<header class="mp-pagehead">
		<div>
			<h1 id="page-title" class="mp-large">More</h1>
			<p class="mp-foot mp-ink2">Every other page of MyPaisa</p>
		</div>
	</header>
	<nav class="mp-card cpad" aria-label="More pages">
		<div class="lrows">
			{#each MORE_PAGES as p (p.href)}
				<a class="lrow" href={resolve(p.href)}>
					<span class="mp-icontile mp-neutral"><NavIcon name={p.icon} small /></span>
					<span class="rtx mp-sub mp-w6">{p.label}</span>
					<ChevronRight class="lc lc-s mp-ink2" aria-hidden="true" />
				</a>
			{/each}
		</div>
	</nav>
</div>
