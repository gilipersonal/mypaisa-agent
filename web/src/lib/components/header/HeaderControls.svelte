<script lang="ts">
	// The four controls at the top right of every page's head (MA-358; board Web v4 · Header controls, MA-355 b 1a):
	// whose view, a hairline, then the currency, the appearance and Hide amounts, as labelled pills that each name what
	// is set. They read the shell's choices, so they hold on every page and in the chat, and none changes a record. The
	// bar never waits for the page: it is whole while the figures are read, when they cannot be, and before anything is
	// recorded. Under 600 px it is one row under the title: whose view and the currency keep their labels, the
	// appearance and the eye are icons, and each menu is a sheet from the bottom.
	import { MediaQuery } from 'svelte/reactivity';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import User from '@lucide/svelte/icons/user';
	import Users from '@lucide/svelte/icons/users';
	import { useAppearance } from '#lib/components/shell/appearance.svelte.ts';
	import type { Appearance } from '#lib/components/shell/palette.ts';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { HOUSEHOLD_VIEW } from '#lib/wealth/prefs.ts';
	import { useHeaderChoice } from './choice.svelte.ts';
	import {
		APPEARANCES,
		CURRENCIES,
		NOT_AVAILABLE,
		appearanceIcon,
		appearanceLabel,
		appearanceOf,
		currencyLabel,
		currencyNote,
		currencyOf,
		isDisplayCurrency,
		viewLabel,
		viewNote,
		whoLabel,
		type ViewChoice
	} from './options.ts';
	import PillChoice, { type PillRow } from './PillChoice.svelte';
	import './header.css';

	let {
		views,
		rate
	}: {
		/** Household, Me and each other member, as the overview lists them; the household alone until they are read. */
		views?: readonly ViewChoice[] | undefined;
		/** The hero's rate line, for the day's rate under the currency menu. */
		rate?: string | undefined;
	} = $props();

	const choice = useHeaderChoice();
	const appearance = useAppearance();
	const privacy = usePrivacy();
	const phone = new MediaQuery('(max-width: 599px)', false);
	const deviceDark = new MediaQuery('(prefers-color-scheme: dark)', false);
	const compact = $derived(phone.current);

	const whoRows = $derived<PillRow[]>(
		(views?.length ? views : [{ id: HOUSEHOLD_VIEW, label: 'Household' }]).map((v) => ({
			id: v.id,
			title: v.label,
			sub: viewNote(v),
			icon: v.id === HOUSEHOLD_VIEW ? Users : User
		}))
	);
	const who = $derived(viewLabel(choice.view, views));

	const ccyRows: PillRow[] = CURRENCIES.map((c) => ({
		id: c.code,
		title: c.name,
		coin: c.symbol,
		code: c.code,
		sub: c.available ? undefined : NOT_AVAILABLE,
		disabled: !c.available
	}));
	const ccy = $derived(currencyOf(choice.currency));

	const lookRows: PillRow[] = APPEARANCES.map((a) => ({
		id: a.id,
		title: a.label,
		sub: a.note,
		icon: a.id === 'system' ? MonitorSmartphone : a.id === 'dark' ? Moon : Sun
	}));
	const look = $derived(appearanceOf(appearance.value));
	const LookIcon = $derived(appearanceIcon(appearance.value, deviceDark.current) === 'moon' ? Moon : Sun);

	/** Toolbar keys: the left and right arrows move between the pills, as Tab does. */
	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
		const bar = event.currentTarget as HTMLElement;
		const pills = [...bar.querySelectorAll<HTMLElement>('.vpill')];
		const at = pills.indexOf(document.activeElement as HTMLElement);
		if (at < 0) return;
		event.preventDefault();
		const step = event.key === 'ArrowRight' ? 1 : -1;
		pills[(at + step + pills.length) % pills.length]?.focus();
	}
</script>

<div class="vbar" class:vrow={compact} role="toolbar" aria-label="How the money is shown" tabindex="-1" {onkeydown}>
	<PillChoice
		value={choice.view}
		rows={whoRows}
		heading="Whose view"
		label={whoLabel(who)}
		title={who}
		pillClass={compact ? 'vpill who sm' : 'vpill who'}
		{compact}
		onChoose={(id: string) => {
			choice.setView(id);
		}}
	>
		{#snippet pill()}<span class="who-t">{who}</span>{/snippet}
	</PillChoice>
	{#if !compact}<span class="vsep" aria-hidden="true"></span>{/if}
	<PillChoice
		value={choice.currency}
		rows={ccyRows}
		heading="Show amounts in"
		label={currencyLabel(choice.currency)}
		pillClass={compact ? 'vpill ccy sm' : 'vpill ccy'}
		footer={currencyNote(rate)}
		{compact}
		onChoose={(id: string) => {
			if (isDisplayCurrency(id)) choice.setCurrency(id);
		}}
	>
		{#snippet pill()}<span class="vcoin" aria-hidden="true">{ccy.symbol}</span><span>{ccy.code}</span>{/snippet}
	</PillChoice>
	{#if compact}<span class="vgap"></span>{/if}
	<PillChoice
		value={appearance.value}
		rows={lookRows}
		heading="Appearance"
		label={appearanceLabel(appearance.value)}
		pillClass={compact ? 'vpill sm io' : 'vpill'}
		align="end"
		narrow
		{compact}
		onChoose={(id: string) => {
			appearance.set(id as Appearance);
		}}
	>
		{#snippet pill()}<LookIcon class="lc" aria-hidden="true" />{#if !compact}<span>{look.label}</span>{/if}{/snippet}
	</PillChoice>
	<button
		type="button"
		class={compact ? 'vpill tog sm io' : 'vpill tog'}
		aria-pressed={privacy.on}
		aria-label="Hide amounts"
		onclick={() => {
			privacy.toggle();
		}}
	>
		{#if privacy.on}<EyeOff class="lc" aria-hidden="true" />{:else}<Eye class="lc" aria-hidden="true" />{/if}
		{#if !compact}<span>{privacy.on ? 'Show amounts' : 'Hide amounts'}</span>{/if}
	</button>
</div>
