<script lang="ts">
	// Development only (MA-198): the scripted journey on the local stack, through the page's own /v1 proxy.
	import * as Card from '#lib/components/ui/card/index.ts';
	import { runJourney, type JourneyResult, type OpenStream } from '#lib/local/journey.ts';

	const open: OpenStream = async (url, headers, onChunk, signal) => {
		const response = await fetch(url, { headers, signal });
		if (!response.body) throw new Error('the stream has no body');
		const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
		for (;;) {
			const { value, done } = await reader.read();
			if (done) return;
			onChunk(value);
		}
	};

	const journey: Promise<JourneyResult> = runJourney('', 'owner_arun', `web-${String(Date.now())}`, open);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>The local stack</Card.Title>
		<Card.Description>The scripted journey: sign in, say hello, read the reply as it streams.</Card.Description>
	</Card.Header>
	<Card.Content aria-live="polite">
		{#await journey}
			<p class="text-muted-foreground">Asking…</p>
		{:then result}
			<p data-testid="mp.local.reply">{result.reply}</p>
		{:catch error}
			<p class="text-alert">The journey failed: {String(error)}</p>
		{/await}
	</Card.Content>
</Card.Root>
