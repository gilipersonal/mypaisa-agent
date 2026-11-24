<script lang="ts">
	// The shell's Lucide icons by name (MA-301 f 1a), so the places in nav.ts stay plain data.
	import type { Component } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import ChartPie from '@lucide/svelte/icons/chart-pie';
	import CircleUser from '@lucide/svelte/icons/circle-user';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import House from '@lucide/svelte/icons/house';
	import Landmark from '@lucide/svelte/icons/landmark';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Shield from '@lucide/svelte/icons/shield';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import Wallet from '@lucide/svelte/icons/wallet';

	let { name }: { name: string } = $props();
	const ICONS: Record<string, Component<{ class?: string; 'aria-hidden'?: 'true' }>> = {
		activity: Activity,
		'chart-pie': ChartPie,
		'circle-user': CircleUser,
		'clipboard-check': ClipboardCheck,
		house: House,
		landmark: Landmark,
		'message-circle': MessageCircle,
		shield: Shield,
		'trending-up': TrendingUp,
		wallet: Wallet
	};
	const Icon = $derived(ICONS[name]);
</script>

{#if Icon}<Icon class="lc" aria-hidden="true" />{/if}
