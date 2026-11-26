<script lang="ts">
	// The sign-in page (MA-185, option 1b "The navy door", picked by Arun on 25 Nov 2026), on the stubbed session: Apple,
	// Google or a passkey signs in with no network, then the passkey offer (after a first Apple or Google sign-in on this
	// browser) or Home. MA-109, MA-143 and MA-73 bring the real sign-in behind the same page. `?state=<moment>` shows
	// each moment for review (./door.ts).
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import { browserSession, type Way } from '#lib/auth/session.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import Door from './Door.svelte';
	import { navyOf, takesFocus, waysLive, type Moment } from './door.ts';
	import Notice from './Notice.svelte';
	import PasskeyOffer from './PasskeyOffer.svelte';
	import Ways from './Ways.svelte';

	/** How long the stub takes to sign in, so the waiting moment shows. */
	const STUB_WAIT_MS = 700;

	let { initial }: { initial: Moment } = $props();

	const session = browserSession();
	// The page opens on the moment the address asks for; it moves on from there as the member signs in.
	// svelte-ignore state_referenced_locally
	let moment = $state<Moment>(initial);
	// svelte-ignore state_referenced_locally
	let busy = $state<Way | undefined>(initial === 'waiting' ? 'apple' : undefined);
	let signedInWith = $state<Way>('apple');
	let online = $state(true);
	let message: HTMLElement | undefined = $state();

	/** With no connection the page says so, unless it is already further on. */
	const shown = $derived<Moment>(!online && (moment === 'ready' || moment === 'noanswer') ? 'offline' : moment);
	const navy = $derived(navyOf(shown));

	onMount(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		if (takesFocus(moment)) message?.focus();
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});

	async function signIn(way: Way) {
		if (!waysLive(shown)) return;
		busy = way;
		moment = 'waiting';
		await new Promise((done) => setTimeout(done, STUB_WAIT_MS));
		const { offer } = session.signIn(way);
		busy = undefined;
		if (offer) {
			signedInWith = way;
			moment = 'passkey';
			await tick();
		} else {
			await goto(resolve('/'));
		}
	}

	async function finishOffer() {
		// Opened by the review switch with no one signed in: the offer signs in as it would have.
		if (!session.current()) session.signIn(signedInWith);
		session.markOffered();
		await goto(resolve('/'));
	}
</script>

<svelte:head><title>Sign in · MyPaisa</title></svelte:head>

<!-- The page's root for tests (MA-304): `display: contents`, so the door lays out as if it were not there. -->
<div class="contents" data-testid={TestIDs.signInView}>
	<Door {navy}>
		{#if shown === 'paused'}
			<p bind:this={message} class="door-line" role="alert" tabindex="-1">
				The household’s owner has paused your access to MyPaisa.
			</p>
		{:else if shown === 'passkey'}
			<PasskeyOffer way={signedInWith} ondone={() => void finishOffer()} />
		{:else}
			{#if shown === 'unlinked'}
				<h1 bind:this={message} class="door-h sm" role="alert" tabindex="-1">
					That Google account isn’t linked to MyPaisa
				</h1>
				<p class="door-p mp-body mp-ink2">
					Sign in with the account you joined with. If that was Apple, sign in with Apple; you can add Google
					afterwards, from You.
				</p>
			{:else}
				<h1 class="door-h">Sign in</h1>
				<p class="door-p mp-body mp-ink2">With the Apple or Google account you joined with.</p>
			{/if}
			{#if shown === 'offline'}
				<Notice kind="offline" />
			{:else if shown === 'noanswer'}
				<Notice kind="noanswer" />
			{/if}
			<Ways verb="Sign in" {busy} live={waysLive(shown)} onway={(way: Way) => void signIn(way)} />
			<p class="sr-only" role="status">{busy ? 'Signing in…' : ''}</p>
			{#if shown !== 'unlinked'}
				<p class="door-p mp-foot mp-ink2">
					No password. A passkey works after your first sign-in with Apple or Google.
				</p>
			{/if}
			<div class="door-hair">
				<p class="door-p mp-foot mp-ink2">
					{shown === 'unlinked' ? 'Not a member yet?' : 'New here?'} MyPaisa is by invite. Ask your household’s owner for
					a link.
				</p>
			</div>
		{/if}
	</Door>
</div>
