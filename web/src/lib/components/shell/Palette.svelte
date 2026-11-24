<script lang="ts">
	// The ⌘K palette (MA-353, Web v4 · Shell and chat 2h): one dialog over any page to go, find or ask. Built on bits-ui's
	// Dialog and Command, as TECH_STACK names them: Escape closes it and focus returns where it was, arrows move, Return
	// opens, and a screen reader hears a labelled dialog with a listbox. The rows are paletteGroups' own, so the list
	// filters itself; nothing is created here: a flow row only opens its flow in the chat.
	import { Command, Dialog } from 'bits-ui';
	import Search from '@lucide/svelte/icons/search';
	import NavIcon from './NavIcon.svelte';
	import { paletteGroups, SHORTCUT_PAGES, type Appearance, type PaletteAction } from './palette.ts';

	let {
		open = $bindable(false),
		appearance,
		onAction
	}: {
		open?: boolean;
		appearance: Appearance;
		onAction: (action: PaletteAction) => void;
	} = $props();

	let query = $state('');
	const groups = $derived(paletteGroups(query, appearance));

	function run(action: PaletteAction) {
		open = false;
		query = '';
		onAction(action);
	}

	// ⌘1 to ⌘4 open the four pages the palette lists while it is up.
	function onkeydown(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey)) return;
		const href = SHORTCUT_PAGES[Number(event.key) - 1];
		if (href === undefined) return;
		event.preventDefault();
		run({ kind: 'go', href });
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(o) => {
		if (!o) query = '';
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="mp-scrim pal-scrim" />
		<Dialog.Content class="pal" aria-label="Go to, find or ask" {onkeydown}>
			<Dialog.Title class="sr-only">Go to, find or ask</Dialog.Title>
			<Command.Root shouldFilter={false} loop label="Go to, find or ask">
				<div class="pfield">
					<Search class="lc" aria-hidden="true" />
					<Command.Input
						class="pq"
						placeholder="Search, go to, or ask MyPaisa"
						aria-label="Search, go to, or ask MyPaisa"
						bind:value={query}
					/>
					<span class="kbd" aria-hidden="true">esc</span>
				</div>
				<Command.List class="plist" aria-label="Results">
					{#each groups as group (group.heading)}
						<Command.Group value={group.heading}>
							<Command.GroupHeading class="pgh">{group.heading}</Command.GroupHeading>
							<Command.GroupItems>
								{#each group.rows as row (row.id)}
									<Command.Item
										class="prow"
										value={row.id}
										onSelect={() => {
											run(row.action);
										}}
									>
										<NavIcon name={row.icon} small />
										<span class="flex min-w-0 flex-1 flex-col">
											<span class="mp-sub">{row.label}</span>
											{#if row.sub}<span class="mp-foot mp-ink2">{row.sub}</span>{/if}
										</span>
										{#if row.key}<span class="kbd">{row.key}</span>{/if}
									</Command.Item>
								{/each}
							</Command.GroupItems>
						</Command.Group>
					{/each}
				</Command.List>
			</Command.Root>
			<div class="pfoot" aria-hidden="true"><span>↑↓ to move</span><span>↵ to open</span><span>⌘K anywhere</span></div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
