<script lang="ts">
	// The passkey offer (MA-185, 1b): once per browser, straight after the first Apple or Google sign-in there. Not now is
	// remembered on this browser, and You still offers it. The focus goes to its heading as it arrives. After a join it
	// says which household the member is now in, and what comes next (Web v4 · Login, invite and responsive: Browser ·
	// Join, a passkey after Apple).
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import { onMount } from 'svelte';
	import type { Way } from '#lib/auth/session.ts';
	import { WAY_NAMES } from './door.ts';

	let { way, joined, ondone }: { way: Way; joined?: string | undefined; ondone: (added: boolean) => void } = $props();

	let heading: HTMLHeadingElement | undefined = $state();

	onMount(() => {
		heading?.focus();
	});
</script>

<div class="door-done">
	<CircleCheck class="lc" aria-hidden="true" /><span>
		{joined ? `You’re in the ${joined} household` : `Signed in with ${WAY_NAMES[way]}`}
	</span>
</div>
<h1 bind:this={heading} class="door-h" tabindex="-1">Sign in faster next time?</h1>
<p class="door-p mp-body mp-ink2">
	Add a passkey for this browser: next time it is your fingerprint, face or screen lock, no password.
</p>
<div class="door-ways">
	<button
		type="button"
		class="mp-btn mp-btn-primary door-way"
		onclick={() => {
			ondone(true);
		}}
	>
		<KeyRound class="lc" aria-hidden="true" />Add a passkey
	</button>
	<button
		type="button"
		class="mp-btn mp-btn-plain door-way"
		onclick={() => {
			ondone(false);
		}}
	>
		Not now
	</button>
</div>
<p class="door-p mp-foot mp-ink2">
	You can add one later from You.{joined ? ' Next: three short questions, then your household.' : ''}
</p>
