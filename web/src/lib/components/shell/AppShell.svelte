<script lang="ts">
	// The web app's shell, 1a Chat beside (MA-199, picked on MA-193): the sidebar from 1024 px, the page, and the chat.
	// From about 1393 px the chat sits beside every page and may be hidden for a wider page; from 1024 to 1392 px it is
	// a drawer over the page, from the sidebar's Chat; under 1024 px the tab bar holds Chat, Home, Activity and You.
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { onMount, type Snippet } from 'svelte';
	import { FakeTransport } from '#lib/chat/fake.ts';
	import { Outbox } from '#lib/chat/outbox.ts';
	import { ChatSession, provideChat } from '#lib/chat/session.svelte.ts';
	import Mark from '#lib/components/brand/Mark.svelte';
	import ChatPanel from '#lib/components/chat/ChatPanel.svelte';
	import NavIcon from './NavIcon.svelte';
	import { ADMIN, PAGES, TABS, isCurrent, placeOf } from './nav.ts';

	let { children }: { children: Snippet } = $props();

	function storage(): Storage | undefined {
		try {
			return window.localStorage;
		} catch {
			return undefined; // blocked: the outbox then lives only as long as the page
		}
	}

	// MA-352 swaps the fake for the transport over the chat api and the stream; nothing else here changes.
	const chat = new ChatSession(useQueryClient(), new FakeTransport(), new Outbox(storage()), {
		online: () => navigator.onLine,
		addEventListener: (type, fn) => {
			window.addEventListener(type, fn);
		},
		removeEventListener: (type, fn) => {
			window.removeEventListener(type, fn);
		}
	});
	provideChat(chat);

	const HIDDEN_KEY = 'mp.chat.hidden';
	let hidden = $state(storage()?.getItem(HIDDEN_KEY) === '1');
	let drawer = $state(false);
	let wide = $state(false);
	let field: HTMLTextAreaElement | undefined = $state();

	const path = $derived(page.url.pathname);
	const onChat = $derived(path === '/chat');
	const place = $derived(placeOf(path));

	onMount(() => {
		const beside = window.matchMedia('(min-width: 1393px)');
		const sync = () => {
			wide = beside.matches;
			if (wide) drawer = false;
		};
		sync();
		beside.addEventListener('change', sync);
		const stop = chat.start();
		return () => {
			beside.removeEventListener('change', sync);
			stop();
		};
	});

	function setHidden(value: boolean) {
		hidden = value;
		try {
			storage()?.setItem(HIDDEN_KEY, value ? '1' : '0');
		} catch {
			// the choice lasts for this page only
		}
	}

	function openChat() {
		if (wide) {
			setHidden(false);
			queueMicrotask(() => field?.focus());
		} else {
			drawer = !drawer;
			if (drawer) queueMicrotask(() => field?.focus());
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && drawer) drawer = false;
	}
</script>

<svelte:window {onkeydown} />

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:min-h-11 focus:px-4 focus:py-3"
>
	Skip to content
</a>

<div class="mp mp-app mp-root">
	<div class="mp-shell shl sh-a" class:v-chat={onChat} class:c-drawer={drawer} class:nochat={hidden}>
		<aside class="mp-side mp-shell-side side" aria-label="MyPaisa">
			<div class="brand"><Mark size={32} /><span class="mp-hl">MyPaisa</span></div>
			<nav class="flex flex-col gap-1" aria-label="Pages">
				<button
					type="button"
					class="mp-side-i"
					class:pr={drawer}
					aria-expanded={wide ? !hidden : drawer}
					onclick={openChat}
				>
					<NavIcon name="message-circle" />Chat
				</button>
				{#each PAGES as p (p.href)}
					<a
						class="mp-side-i"
						class:on={place === p}
						href={resolve(p.href)}
						aria-current={place === p ? 'page' : undefined}
					>
						<NavIcon name={p.icon} />{p.label}
					</a>
				{/each}
				<div class="side-sep" role="presentation"></div>
				<a
					class="mp-side-i"
					class:on={place === ADMIN}
					href={resolve(ADMIN.href)}
					aria-current={place === ADMIN ? 'page' : undefined}
				>
					<NavIcon name={ADMIN.icon} />{ADMIN.label}
				</a>
			</nav>
		</aside>

		<main id="main" tabindex="-1" class="mp-shell-main main outline-none">
			{@render children()}
		</main>

		<section class="chatcol" aria-label="Chat">
			<ChatPanel
				mode={wide ? 'beside' : 'drawer'}
				context={onChat ? undefined : place?.label}
				bind:field
				onClose={() => {
					if (wide) setHidden(true);
					else drawer = false;
				}}
			/>
		</section>

		<nav class="mp-tabbar mp-shell-tabs tabs" aria-label="Sections">
			{#each TABS as t (t.href)}
				{@const on = isCurrent(t, path)}
				<a class="mp-tab" class:on href={resolve(t.href)} data-testid={t.testId} aria-current={on ? 'page' : undefined}>
					<NavIcon name={t.icon} />{t.label}
				</a>
			{/each}
		</nav>
	</div>
</div>
