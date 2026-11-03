<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { createApiClient } from '#lib/api/client.ts';
	import { livenessQuery } from '#lib/api/queries.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';

	const api = createApiClient();
	const health = createQuery(() => livenessQuery(api));
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>The api</Card.Title>
		<Card.Description>Read through TanStack Query from <code>/v1/health</code>.</Card.Description>
	</Card.Header>
	<Card.Content aria-live="polite">
		{#if health.isPending}
			<p class="text-muted-foreground">Asking…</p>
		{:else if health.isError}
			<p class="text-alert">Not reachable: {health.error.message}</p>
		{:else}
			<p>
				<span class="font-semibold text-up">Up</span>, version {health.data.version}, {health.data.environment}.
			</p>
		{/if}
	</Card.Content>
	<Card.Footer>
		<Button variant="outline" onclick={() => health.refetch()} disabled={health.isFetching}>Check again</Button>
	</Card.Footer>
</Card.Root>
