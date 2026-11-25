<script lang="ts">
	// An invite link (MA-185, 1b): drawn without the app's shell, for anyone, signed in or not. `/join/used` and
	// `/join/expired` show a link that no longer works; any other token opens Arun's invite (#lib/auth/invite.ts).
	import { page } from '$app/state';
	import JoinPage from '#lib/components/auth/JoinPage.svelte';
</script>

{#key page.params.token}
	<JoinPage token={page.params.token ?? ''} />
{/key}
