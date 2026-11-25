<script lang="ts">
	// The shell's Lucide icons by name (MA-301 f 1a), so the places in nav.ts and the palette's rows stay plain data.
	import type { Component } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import Banknote from '@lucide/svelte/icons/banknote';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import House from '@lucide/svelte/icons/house';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Menu from '@lucide/svelte/icons/menu';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Moon from '@lucide/svelte/icons/moon';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import Receipt from '@lucide/svelte/icons/receipt';
	import Search from '@lucide/svelte/icons/search';
	import Shield from '@lucide/svelte/icons/shield';
	import Sun from '@lucide/svelte/icons/sun';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Wallet from '@lucide/svelte/icons/wallet';

	let { name, small = false }: { name: string; small?: boolean } = $props();
	const ICONS: Record<string, Component<{ class?: string; 'aria-hidden'?: 'true' }>> = {
		activity: Activity,
		banknote: Banknote,
		'chart-pie': ChartPie,
		'circle-user': CircleUser,
		'clipboard-check': ClipboardCheck,
		'file-text': FileText,
		house: House,
		landmark: Landmark,
		menu: Menu,
		'message-circle': MessageCircle,
		monitor: Monitor,
		moon: Moon,
		'piggy-bank': PiggyBank,
		receipt: Receipt,
		search: Search,
		shield: Shield,
		sun: Sun,
		'trending-up': TrendingUp,
		wallet: Wallet
	};
	const Icon = $derived(ICONS[name]);
</script>

{#if Icon}<Icon class={small ? 'lc lc-s' : 'lc'} aria-hidden="true" />{/if}
