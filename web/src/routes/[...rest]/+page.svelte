<script lang="ts">
	// A page the shell names but no story has built yet, or an address that is nowhere: said plainly, with the way home.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { placeOf } from '#lib/components/shell/nav.ts';

	const place = $derived(placeOf(page.url.pathname));
</script>

<svelte:head><title>{place ? place.label : 'Not found'} · MyPaisa</title></svelte:head>

<div class="mp-pagepad">
	<div class="mp-pagehead">
		<div class="flex flex-col gap-1">
			<h1 class="mp-large">{place ? place.label : 'Nothing here'}</h1>
			<p class="mp-sub mp-ink2">
				{place
					? `${place.label} is not built yet. It arrives with its phase in the plan; the chat works now.`
					: 'This address is not part of MyPaisa.'}
			</p>
		</div>
	</div>
	<a class="mp-btn mp-btn-tinted self-start" href={resolve('/')}>Go to Home</a>
</div>
