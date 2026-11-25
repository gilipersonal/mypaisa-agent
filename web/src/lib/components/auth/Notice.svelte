<script lang="ts">
	// A notice on the page's own ground, as the chat sheet's banner reads (MA-185, 1b "Waiting, offline and no answer").
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import CloudOff from '@lucide/svelte/icons/cloud-off';
	import type { Way } from '#lib/auth/session.ts';
	import { WAY_NAMES } from './door.ts';

	let { kind, way = 'apple' }: { kind: 'offline' | 'noanswer'; way?: Way } = $props();
</script>

{#if kind === 'offline'}
	<div class="door-ban off" role="status">
		<CloudOff class="lc lc-s" aria-hidden="true" /><span>
			<b>You’re offline.</b> Signing in needs a connection. The buttons work again when you’re back.
		</span>
	</div>
{:else}
	<div class="door-ban err" role="alert">
		<CircleAlert class="lc lc-s" aria-hidden="true" /><span>
			<b>MyPaisa didn’t answer.</b> Your {WAY_NAMES[way]} sign-in went through, but MyPaisa didn’t answer in time. Try again.
		</span>
	</div>
{/if}
