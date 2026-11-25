<script lang="ts">
	// A button that names what is chosen and opens a menu of the choices (MA-301 a 1b): the Projection's title, which
	// picks the view, and the hero's corner button, which picks the money. On the web a menu is a popover on the page's
	// own surface with a hairline and a shadow, never glass; bits-ui's DropdownMenu with a radio group gives it its
	// keys (arrows, Return, Escape, with focus back on the button) and its roles.
	import { DropdownMenu } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import type { TestID } from '#lib/test-ids.ts';

	let {
		kind,
		value,
		options,
		label,
		menuLabel,
		testId,
		anchor,
		onChoose
	}: {
		/** The page's title, or the hero's corner button. */
		kind: 'title' | 'corner';
		value: string;
		options: readonly { id: string; label: string }[];
		/** What a screen reader hears for the button: "Projection: Net worth. Change view". */
		label: string;
		menuLabel: string;
		testId: TestID;
		/** What the menu hangs under, when that is more than its button: the title with the line under it. */
		anchor?: HTMLElement | undefined;
		onChoose: (id: string) => void;
	} = $props();

	const chosen = $derived(options.find((o) => o.id === value)?.label ?? '');
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={kind === 'title' ? 'ttlmenu' : 'cornerbtn'} aria-label={label} data-testid={testId}>
		{chosen}<ChevronDown class="lc" aria-hidden="true" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			class="tpop"
			align={kind === 'title' ? 'start' : 'end'}
			sideOffset={6}
			customAnchor={anchor ?? null}
			aria-label={menuLabel}
		>
			<DropdownMenu.RadioGroup {value} onValueChange={onChoose}>
				{#each options as option (option.id)}
					<DropdownMenu.RadioItem class="tm-i" value={option.id}>
						{#snippet children({ checked })}
							<span>{option.label}</span>
							{#if checked}<Check class="lc" aria-hidden="true" />{/if}
						{/snippet}
					</DropdownMenu.RadioItem>
				{/each}
			</DropdownMenu.RadioGroup>
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
