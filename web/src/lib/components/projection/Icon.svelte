<script lang="ts">
	// The Projection's Lucide icons by name (MA-301 f 1a), so a milestone, a plan item and a source stay plain data in the
	// view model. The names are the ones the board's icons map to (docs/design/ds-v1/lucide.js).
	import type { Component } from 'svelte';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Calculator from '@lucide/svelte/icons/calculator';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Car from '@lucide/svelte/icons/car';
	import Construction from '@lucide/svelte/icons/construction';
	import FileText from '@lucide/svelte/icons/file-text';
	import Gift from '@lucide/svelte/icons/gift';
	import Globe from '@lucide/svelte/icons/globe';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import House from '@lucide/svelte/icons/house';
	import HousePlus from '@lucide/svelte/icons/house-plus';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Percent from '@lucide/svelte/icons/percent';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import RotateCcwClock from '@lucide/svelte/icons/rotate-ccw-clock';
	import Shield from '@lucide/svelte/icons/shield';
	import TreePalm from '@lucide/svelte/icons/tree-palm';
	import User from '@lucide/svelte/icons/user';

	let { name, small = false }: { name: string; small?: boolean } = $props();
	const ICONS: Record<string, Component<{ class?: string; 'aria-hidden'?: 'true' }>> = {
		calculator: Calculator,
		calendar: Calendar,
		car: Car,
		construction: Construction,
		contract: FileText,
		gift: Gift,
		history: RotateCcwClock,
		house: House,
		'house-plus': HousePlus,
		landmark: Landmark,
		member: User,
		percent: Percent,
		school: GraduationCap,
		work: Briefcase,
		'piggy-bank': PiggyBank,
		prior: Globe,
		shield: Shield,
		'tree-palm': TreePalm
	};
	const Icon = $derived(ICONS[name]);
</script>

{#if Icon}<Icon class={small ? 'lc lc-s' : 'lc'} aria-hidden="true" />{/if}
