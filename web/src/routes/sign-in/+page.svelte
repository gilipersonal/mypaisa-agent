<script lang="ts">
	// The sign-in page (MA-185, 1b): drawn without the app's shell. `?state=<moment>` opens a moment for review.
	import { page } from '$app/state';
	import SignInPage from '#lib/components/auth/SignInPage.svelte';
	import { momentOf } from '#lib/components/auth/door.ts';
</script>

{#key page.url.search}
	<SignInPage initial={momentOf(page.url.search)} />
{/key}
