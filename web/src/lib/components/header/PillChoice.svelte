<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface PillRow {
		id: string;
		title: string;
		sub?: string | undefined;
		/** A currency's coin, in place of an icon. */
		coin?: string | undefined;
		code?: string | undefined;
		icon?: Component<{ class?: string; 'aria-hidden'?: 'true' }> | undefined;
		/** Listed, and not chosen: a currency the records cannot show yet. */
		disabled?: boolean | undefined;
	}
</script>

<script lang="ts">
	// One of the header's pills that opens a choice (MA-358, Web v4 · Header controls, b 1a): whose view, the currency
	// or the appearance. From 600 px the choice is a menu on paper under its pill (bits-ui's DropdownMenu with a radio
	// group gives it its keys and roles: Enter, Space or the down arrow opens it on the row in force, the arrows move,
	// Enter chooses, Escape closes with focus back on the pill). Under 600 px it is a sheet from the bottom with 52 px
	// rows (bits-ui's Dialog: a tap outside, Escape, a swipe down or a choice closes it, focus back on the pill).
	import { Dialog, DropdownMenu } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { nextEnabled } from './options.ts';

	let {
		value,
		rows,
		heading,
		label,
		title,
		pillClass,
		compact,
		chevron = true,
		align = 'start',
		narrow = false,
		footer,
		pill,
		onChoose
	}: {
		value: string;
		rows: readonly PillRow[];
		/** The menu's heading and its spoken name: "Whose view". */
		heading: string;
		/** The pill's spoken name: "Whose view: Household. Change it". */
		label: string;
		/** The whole name on hover, when the pill cuts it. */
		title?: string | undefined;
		pillClass: string;
		/** Under 600 px: the phone's row, and a sheet in place of the menu. */
		compact: boolean;
		chevron?: boolean;
		align?: 'start' | 'end';
		narrow?: boolean;
		footer?: string | undefined;
		pill: Snippet;
		onChoose: (id: string) => void;
	} = $props();

	let open = $state(false);
	let menu: HTMLElement | null = $state(null);
	let sheet: HTMLElement | null = $state(null);

	/** Opening puts focus on the row in force, as the board's keys say. */
	function focusChecked(event: Event, root: HTMLElement | null) {
		const row = root?.querySelector<HTMLElement>('[aria-checked="true"]');
		if (!row) return;
		event.preventDefault();
		row.focus();
	}

	function choose(id: string) {
		if (rows.find((r) => r.id === id)?.disabled) return;
		if (id !== value) onChoose(id);
		open = false;
	}

	/** The sheet's rows are a menu: the arrows, Home and End move between the rows that can be chosen. */
	function rove(event: KeyboardEvent) {
		const items = [...(sheet?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
		const at = items.findIndex((el) => el === document.activeElement);
		const disabled = items.map((el) => el.disabled);
		let to: number;
		if (event.key === 'ArrowDown') to = nextEnabled(disabled, at, 1);
		else if (event.key === 'ArrowUp') to = nextEnabled(disabled, at < 0 ? 0 : at, -1);
		else if (event.key === 'Home') to = nextEnabled(disabled, -1, 1);
		else if (event.key === 'End') to = nextEnabled(disabled, items.length, -1);
		else return;
		event.preventDefault();
		items[to]?.focus();
	}

	// A swipe down on the sheet closes it, as a sheet on the phone does.
	let swipeFrom: number | undefined;
	function swipeStart(event: PointerEvent) {
		if (event.pointerType !== 'mouse') swipeFrom = event.clientY;
	}
	function swipeEnd(event: PointerEvent) {
		if (swipeFrom !== undefined && event.clientY - swipeFrom > 60) open = false;
		swipeFrom = undefined;
	}
</script>

{#snippet row(r: PillRow, checked: boolean)}
	{#if r.coin}
		<span class="vcoin" aria-hidden="true">{r.coin}</span>
	{:else if r.icon}
		<r.icon class="lc lead" aria-hidden="true" />
	{/if}
	<span class="vm-b">
		<span class="vm-t">{r.title}</span>
		{#if r.sub}<span class="vm-s">{r.sub}</span>{/if}
	</span>
	{#if r.code}<span class="vm-code">{r.code}</span>{/if}
	{#if checked}<Check class="lc chk" aria-hidden="true" />{:else}<span class="chk" aria-hidden="true"></span>{/if}
{/snippet}

{#if compact}
	<Dialog.Root bind:open>
		<Dialog.Trigger class={pillClass} aria-label={label} {title}>
			{@render pill()}
			{#if chevron}<ChevronDown class="lc chv" aria-hidden="true" />{/if}
		</Dialog.Trigger>
		<Dialog.Portal>
			<Dialog.Overlay class="mp-scrim vscrim" />
			<Dialog.Content
				class="mp-sheet vsheet"
				bind:ref={sheet}
				onOpenAutoFocus={(e: Event) => {
					focusChecked(e, sheet);
				}}
				onpointerdown={swipeStart}
				onpointerup={swipeEnd}
				onpointercancel={() => (swipeFrom = undefined)}
			>
				<div class="mp-grabber" aria-hidden="true"></div>
				<Dialog.Title class="vm-h">{heading}</Dialog.Title>
				<div class="vm-list" role="menu" aria-label={heading} tabindex="-1" onkeydown={rove}>
					{#each rows as r (r.id)}
						<button
							type="button"
							class="vm-i"
							role="menuitemradio"
							aria-checked={r.id === value}
							tabindex={r.id === value ? 0 : -1}
							disabled={r.disabled ?? false}
							onclick={() => {
								choose(r.id);
							}}
						>
							{@render row(r, r.id === value)}
						</button>
					{/each}
				</div>
				{#if footer}<p class="vm-f">{footer}</p>{/if}
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{:else}
	<DropdownMenu.Root bind:open>
		<DropdownMenu.Trigger class={pillClass} aria-label={label} {title}>
			{@render pill()}
			{#if chevron}<ChevronDown class="lc chv" aria-hidden="true" />{/if}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				class={narrow ? 'vpop narrow' : 'vpop'}
				bind:ref={menu}
				{align}
				sideOffset={8}
				aria-label={heading}
				onOpenAutoFocus={(e: Event) => {
					focusChecked(e, menu);
				}}
			>
				<div class="vm-h" aria-hidden="true">{heading}</div>
				<DropdownMenu.RadioGroup {value} onValueChange={choose}>
					{#each rows as r (r.id)}
						<DropdownMenu.RadioItem class="vm-i" value={r.id} disabled={r.disabled ?? false}>
							{#snippet children({ checked })}
								{@render row(r, checked)}
							{/snippet}
						</DropdownMenu.RadioItem>
					{/each}
				</DropdownMenu.RadioGroup>
				{#if footer}<div class="vm-f">{footer}</div>{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
{/if}
