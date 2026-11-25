<script lang="ts">
	// Home (MA-208; board Web v4 · Dashboard, 1a Net worth first, with MA-358's head, Web v4 · Header controls b 1a): the
	// household's whole wealth, for the household or one member, in the member's currency, with every amount hidden on
	// Hide amounts. Whose view, the currency, the appearance and Hide amounts are the head's four pills, held by the shell
	// so they carry from page to page. It reads the overview through its query, which the stream's records.changed
	// refetches, so a change confirmed in the chat moves every card with no reload. Nothing is created here: an empty
	// household is shown how to begin in the chat.
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { overviewQuery } from '#lib/api/queries.ts';
	import { useHeaderChoice } from '#lib/components/header/choice.svelte.ts';
	import HeaderControls from '#lib/components/header/HeaderControls.svelte';
	import { useShell } from '#lib/components/shell/actions.ts';
	import { useWealth } from '#lib/components/wealth/context.ts';
	import WealthCardView from '#lib/components/wealth/WealthCardView.svelte';
	import Hero from './Hero.svelte';

	const source = useWealth();
	const shell = useShell();
	const choice = useHeaderChoice();

	const overview = createQuery(() => ({
		...overviewQuery(source, choice.view, choice.currency),
		placeholderData: keepPreviousData
	}));

	// A view this household does not know (a member kept from another sign-in) is answered for the household: the pill
	// follows what the page shows.
	$effect(() => {
		const read = overview.data;
		if (read && !overview.isPlaceholderData && read.view !== choice.view) choice.setView(read.view);
	});

	// The pill names whose view it is, so the line under the title keeps only the day: "Mon 26 Oct · Illustrative
	// figures", as the board draws it.
	const sub = $derived.by(() => {
		const read = overview.data;
		if (!read) return '\u00a0'; // the line keeps its height while the figures are read
		const who = read.views.find((v) => v.id === read.view)?.label;
		return who && read.head.startsWith(`${who} · `) ? read.head.slice(who.length + 3) : read.head;
	});

	function start(id: string) {
		if (id === 'statement') shell.attachFile();
		else shell.openChat();
	}
</script>

<div class="mp-pagepad">
	<header class="mp-pagehead">
		<div>
			<h1 id="page-title" class="mp-large">Home</h1>
			<p class="mp-foot mp-ink2">{sub}</p>
		</div>
		<HeaderControls views={overview.data?.views} rate={overview.data?.hero.rate} />
	</header>

	{#if overview.data}
		<Hero hero={overview.data.hero} />
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
