<script lang="ts">
	// The ways in (MA-185, 1b; §4.5): Apple's and Google's own buttons, Apple's first, then a passkey. No password and
	// nothing to type. While one is signing in, or with no connection, every way stays in its place and in the tab order
	// but does nothing (aria-disabled, never disabled, so the focus stays put).
	import KeyRound from '@lucide/svelte/icons/key-round';
	import type { Way } from '#lib/auth/session.ts';

	let {
		verb,
		passkey = true,
		busy,
		busyLabel = 'Signing in…',
		live,
		onway
	}: {
		/** "Sign in" on the sign-in page, "Continue" on an invite. */
		verb: 'Sign in' | 'Continue';
		/** The passkey is offered only to a member: never on an invite. */
		passkey?: boolean;
		/** The way pressed, while MyPaisa signs in with it. */
		busy?: Way | undefined;
		busyLabel?: string;
		live: boolean;
		onway: (way: Way) => void;
	} = $props();

	const off = $derived(!live || busy !== undefined);

	function press(way: Way) {
		if (!off) onway(way);
	}
</script>

<div class="door-ways">
	<button
		type="button"
		class="mp-btn door-way door-apple"
		aria-busy={busy === 'apple' ? true : undefined}
		aria-disabled={off && busy !== 'apple' ? true : undefined}
		onclick={() => {
			press('apple');
		}}
	>
		<svg class="apl" viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
			></path>
		</svg>{busy === 'apple' ? busyLabel : `${verb} with Apple`}
	</button>
	<button
		type="button"
		class="mp-btn door-way door-google"
		aria-busy={busy === 'google' ? true : undefined}
		aria-disabled={off && busy !== 'google' ? true : undefined}
		onclick={() => {
			press('google');
		}}
	>
		<!-- Google's own G, in Google's own colours (decision.md, default 4) -->
		<svg class="ggl" viewBox="0 0 48 48" aria-hidden="true">
			<path
				fill="#EA4335"
				d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
			></path><path
				fill="#4285F4"
				d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
			></path><path
				fill="#FBBC05"
				d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
			></path><path
				fill="#34A853"
				d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
			></path>
		</svg>{busy === 'google' ? busyLabel : `${verb} with Google`}
	</button>
	{#if passkey}
		<button
			type="button"
			class="mp-btn mp-btn-tinted door-way door-key"
			aria-busy={busy === 'passkey' ? true : undefined}
			aria-disabled={off && busy !== 'passkey' ? true : undefined}
			onclick={() => {
				press('passkey');
			}}
		>
			<KeyRound class="lc" aria-hidden="true" />{busy === 'passkey' ? busyLabel : `${verb} with a passkey`}
		</button>
	{/if}
</div>
