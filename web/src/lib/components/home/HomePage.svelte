<script lang="ts">
	// Home (MA-208; board Web v4 · Dashboard, 1a Net worth first): the household's whole wealth, for the household or
	// one member, in pounds or rupees, with the eye that hides every amount. It reads the overview through its query,
	// which the stream's records.changed refetches, so a change confirmed in the chat moves every card with no reload.
	// Nothing is created here: an empty household is shown how to begin in the chat.
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { overviewQuery } from '#lib/api/queries.ts';
	import { useShell } from '#lib/components/shell/actions.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import WealthCardView from '#lib/components/wealth/WealthCardView.svelte';
	import type { DisplayCurrency } from '#lib/wealth/overview.ts';
	import { readCurrency, saveCurrency } from '#lib/wealth/prefs.ts';
	import Hero from './Hero.svelte';

	const source = useWealth();
	const privacy = usePrivacy();
	const shell = useShell();

	function storage(): Storage | undefined {
		try {
			return window.localStorage;
		} catch {
			return undefined;
		}
	}

	let view = $state('household');
	let currency = $state<DisplayCurrency>(readCurrency(storage()));
	const overview = createQuery(() => ({
		...overviewQuery(source, view, currency),
		placeholderData: keepPreviousData
	}));

	function setCurrency(next: DisplayCurrency) {
		currency = next;
		saveCurrency(storage(), next);
	}

	function start(id: string) {
		if (id === 'statement') shell.attachFile();
		else shell.openChat();
	}
</script>

<div class="mp-pagepad">
	<header class="mp-pagehead">
		<div>
			<h1 id="page-title" class="mp-large">Home</h1>
			<p class="mp-foot mp-ink2">{overview.data?.head ?? 'Household'}</p>
		</div>
		<div class="flex items-center gap-2">
			{#if overview.data}
				<div class="mp-seg whose" role="group" aria-label="Whose view">
					{#each overview.data.views as v (v.id)}
						<button
							type="button"
							class="mp-seg-i"
							class:on={view === v.id}
							aria-pressed={view === v.id}
							onclick={() => (view = v.id)}
						>
							{v.label}
						</button>
					{/each}
				</div>
			{/if}
			<button
				type="button"
				class="iconbtn"
				class:on={privacy.on}
				aria-label="Privacy mode: hide amounts"
				aria-pressed={privacy.on}
				onclick={() => {
					privacy.toggle();
				}}
			>
				{#if privacy.on}<EyeOff class="lc" aria-hidden="true" />{:else}<Eye class="lc" aria-hidden="true" />{/if}
			</button>
		</div>
	</header>

	{#if overview.data}
		<Hero hero={overview.data.hero} {currency} onCurrency={setCurrency} />
		{#each overview.data.rows as row, r (r)}
			<div class="mp-cols" class:one={row.layout === 'one'}>
				{#each row.columns as column, c (c)}
					<div class="mp-col">
						{#each column as card (card.id)}
							<WealthCardView {card} onStart={start} />
						{/each}
					</div>
				{/each}
			</div>
		{/each}
		<p class="mp-foot mp-ink2">{overview.data.foot}</p>
	{:else if overview.isError}
		<div class="mp-card cpad" role="alert">
			<h2 class="mp-hl">Home could not be read</h2>
			<p class="mp-foot mp-ink2 pp">Nothing is lost: the records are as they were. Try again in a moment.</p>
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small self-start" onclick={() => overview.refetch()}>
				Try again
			</button>
		</div>
	{:else}
		<div class="mp-skel h-44" aria-hidden="true"></div>
		<div class="mp-cols" aria-hidden="true">
			<div class="mp-col">
				<div class="mp-skel h-40"></div>
				<div class="mp-skel h-40"></div>
			</div>
			<div class="mp-col"><div class="mp-skel h-64"></div></div>
		</div>
		<p class="sr-only" aria-live="polite">Reading the household's figures…</p>
	{/if}
</div>
