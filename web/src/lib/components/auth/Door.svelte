<script lang="ts">
	// The navy door (MA-185, option 1b, picked 25 Nov 2026): the page drawn without the app's shell. The navy half says
	// what this is (MyPaisa's welcome, or the invitation itself on an invite link); the other half is the way in.
	// Nothing about a household shows here before sign-in, but for the invite's own words.
	import type { Snippet } from 'svelte';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Landmark from '@lucide/svelte/icons/landmark';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import type { Invite } from '#lib/auth/invite.ts';
	import '#lib/styles/auth.css';
	import type { Navy } from './door.ts';

	let { navy, invite, children }: { navy: Navy; invite?: Invite; children: Snippet } = $props();
</script>

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:min-h-11 focus:px-4 focus:py-3"
>
	Skip to content
</a>

<main id="main" tabindex="-1" class="mp door outline-none">
	<div class="door-navy" class:slim={navy.slim} class:quiet={navy.kind === 'quiet'}>
		<div class="door-brand">
			<!-- the mark on the navy, as the board draws it: the coin in its ring -->
			<svg class="door-mark" viewBox="0 0 48 48" aria-hidden="true">
				<path class="ring" d="M41.32 14 A20 20 0 1 1 34 6.68" stroke-width="1.6"></path>
				<circle class="coin" cx="24" cy="24" r="14.6"></circle>
				<g class="pound" stroke-width="2.46">
					<path
						d="M28.58 20.25 C28.3 17.95 26.79 16.55 24.77 16.55 C22.48 16.55 20.96 18.18 20.96 20.47 L20.96 27.64 C20.96 29.38 20.35 30.5 18.95 31.45"
					></path>
					<path d="M18.95 31.45 L29.7 31.45"></path>
					<path d="M18.5 24.84 L25.78 24.84"></path>
				</g>
				<circle class="dot" cx="38.14" cy="9.86" r="3.8"></circle>
			</svg>
			<span class="mp-t3">MyPaisa</span>
		</div>
		{#if navy.kind === 'invite' && invite}
			<div class="door-saywrap">
				<h1 class="door-say">{invite.from} invited you to the {invite.household} household</h1>
				<p class="door-sub">
					As a member you see the household’s whole wealth and can ask the chat anything about it; the admins add and
					correct the records.
				</p>
				<ul class="door-see">
					<li>
						<Landmark class="lc lc-s" aria-hidden="true" /><span>
							Everything the household owns and owes, in pounds and rupees, in one place.
						</span>
					</li>
					<li>
						<MessageCircle class="lc lc-s" aria-hidden="true" /><span>
							A chat that answers your questions about it, in plain words.
						</span>
					</li>
					<li>
						<EyeOff class="lc lc-s" aria-hidden="true" /><span>
							Privacy mode, to hide every amount when someone is looking.
						</span>
					</li>
				</ul>
			</div>
			<span class="door-end"></span>
		{:else if navy.kind === 'welcome'}
			<div class="door-saywrap">
				<p class="door-say">Everything your household owns and owes, in one calm place.</p>
				<p class="door-sub">The UK and India together, kept up to date by talking to MyPaisa.</p>
			</div>
			<span class="door-end"></span>
		{/if}
	</div>
	<div class="door-col">
		<div class="door-box">
			{@render children()}
		</div>
	</div>
</main>
