<script lang="ts">
	// The join page (MA-185, 1b "An invite link"): the invitation itself on the navy, the way in beside it, with the words
	// MA-301 e 1a picked; then the passkey offer, as after any first Apple or Google sign-in on this browser, then Home.
	// A used link says when it was used; an expired one reads as the used one, with the time it ended (decision.md).
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { inviteOf } from '#lib/auth/invite.ts';
	import { browserSession, type Way } from '#lib/auth/session.ts';
	import Door from './Door.svelte';
	import { navyOf } from './door.ts';
	import Notice from './Notice.svelte';
	import PasskeyOffer from './PasskeyOffer.svelte';
	import Ways from './Ways.svelte';

	const STUB_WAIT_MS = 700;

	let { token }: { token: string } = $props();

	const session = browserSession();
	const link = $derived(inviteOf(token));
	let busy = $state<Way | undefined>();
	let joinedWith = $state<Way | undefined>();
	let online = $state(true);

	const navy = $derived(joinedWith ? navyOf('passkey') : link.kind === 'open' ? navyOf('invite') : navyOf(link.kind));
	const title = $derived(
		link.kind === 'open' ? `Join the ${link.invite.household} household` : 'This invite can’t be used'
	);

	onMount(() => {
		online = navigator.onLine;
		const on = () => (online = true);
		const off = () => (online = false);
		window.addEventListener('online', on);
		window.addEventListener('offline', off);
		return () => {
			window.removeEventListener('online', on);
			window.removeEventListener('offline', off);
		};
	});

	async function join(way: Way) {
		if (!online || busy) return;
		busy = way;
		await new Promise((done) => setTimeout(done, STUB_WAIT_MS));
		const { offer } = session.signIn(way, link.invite.joiner);
		busy = undefined;
		if (offer) joinedWith = way;
		else await goto(resolve('/'));
	}
</script>

<svelte:head><title>{title} · MyPaisa</title></svelte:head>

<Door {navy} invite={link.invite}>
	{#if joinedWith}
		<PasskeyOffer way={joinedWith} joined={link.invite.household} ondone={() => void goto(resolve('/'))} />
	{:else if link.kind === 'open'}
		<!-- The invitation on the navy is the page's h1; this half is its way in. -->
		<h2 class="door-h">Join the household</h2>
		{#if !online}
			<Notice kind="offline" />
		{/if}
		<Ways
			verb="Continue"
			passkey={false}
			{busy}
			busyLabel="Joining…"
			live={online}
			onway={(way: Way) => void join(way)}
		/>
		<p class="sr-only" role="status">{busy ? 'Joining…' : ''}</p>
		<p class="door-p mp-foot mp-ink2">
			This link works once, until {link.invite.until}. After you join you can add a passkey for this browser.
		</p>
		<div class="door-linkrow">
			<a class="mp-link" href={resolve('/sign-in')}>Already in the household? Sign in</a>
		</div>
	{:else}
		{#if link.kind === 'used'}
			<h1 class="door-h">This invite has been used</h1>
			<p class="door-p mp-body mp-ink2">Each invite works once. This one was used on {link.usedAt}.</p>
		{:else}
			<h1 class="door-h">This invite has expired</h1>
			<p class="door-p mp-body mp-ink2">Each invite works for 24 hours. This one ended on {link.endedAt}.</p>
		{/if}
		<p class="door-p mp-sub mp-ink2">
			If you are in the {link.invite.household} household, sign in. If you need to join, ask {link.invite.from} for a new
			link: he makes it in the Admin center, and it lasts 24 hours.
		</p>
		<a class="mp-btn mp-btn-primary door-way" href={resolve('/sign-in')}>Sign in</a>
	{/if}
</Door>
