<script lang="ts">
	// The web app's shell, 1a Chat beside (MA-199, picked on MA-193): the sidebar from 1024 px, the page, and the chat.
	// From about 1393 px the chat sits beside every page and may be hidden for a wider page; from 1024 to 1392 px it is
	// a drawer over the page, from the sidebar's Chat; under 1024 px the tab bar holds Chat, Home, Assets, Projection
	// and More (Arun, 5 Nov 2026, MA-334). The wealth pages read a stub of the design figure set (MA-208), which the
	// scripted chat's Confirm writes to, and privacy mode is one switch for every page and the chat.
	// ⌘K, or Search at the top of the sidebar, opens the palette over any page (MA-353).
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { onMount, type Snippet } from 'svelte';
	import { CheckInScript, checkInScenario } from '#lib/chat/checkins.ts';
	import { FakeTransport } from '#lib/chat/fake.ts';
	import { Outbox } from '#lib/chat/outbox.ts';
	import { ChatSession, provideChat } from '#lib/chat/session.svelte.ts';
	import Mark from '#lib/components/brand/Mark.svelte';
	import ChatPanel from '#lib/components/chat/ChatPanel.svelte';
	import { HeaderChoice, provideHeaderChoice } from '#lib/components/header/choice.svelte.ts';
	import { provideWealth } from '#lib/components/wealth/context.ts';
	import { forecastRunOf } from '#lib/stub/forecast.ts';
	import { StubHousehold } from '#lib/stub/household.ts';
	import { StubWealthSource, signedInAs, startsEmpty } from '#lib/stub/source.ts';
	import { provideShell } from './actions.ts';
	import { applyAppearance } from './appearance.ts';
	import { AppearanceSetting, provideAppearance } from './appearance.svelte.ts';
	import NavIcon from './NavIcon.svelte';
	import { ADMIN, PAGES, TABS, isCurrent, placeOf } from './nav.ts';
	import Palette from './Palette.svelte';
	import { commandKeyLabel, nextAppearance, type PaletteAction } from './palette.ts';
	import { PrivacyMode, providePrivacy } from './privacy.svelte.ts';

	let { children }: { children: Snippet } = $props();

	function storage(): Storage | undefined {
		try {
			return window.localStorage;
		} catch {
			return undefined; // blocked: the outbox then lives only as long as the page
		}
	}

	// The stubbed household: the design figure set, or nothing with ?stub=empty, as the owner or with ?as=asha as a
	// member who is not an admin. Each phase's backend story puts the api behind provideWealth, and the pages do not
	// change.
	const signedIn = signedInAs(window.location.search);
	const household = new StubHousehold({
		empty: startsEmpty(window.location.search),
		...(signedIn ? { me: signedIn } : {})
	});
	// ?forecast=pot or ?forecast=wedding opens the Budget forecast on a later state of the evening it draws (MA-262).
	provideWealth(new StubWealthSource(household, undefined, forecastRunOf(window.location.search)));
	providePrivacy(new PrivacyMode(storage()));
	// whose view and the currency, carried from page to page by the header's pills (MA-358)
	provideHeaderChoice(new HeaderChoice(storage()));

	// MA-352 swaps the fake for the transport over the chat api and the stream; nothing else here changes.
	// MA-205: ?checkin=emi or ?checkin=several puts that check-in in the chat, as the daily worker will.
	const scenario = checkInScenario(window.location.search);
	const fake = new FakeTransport(
		undefined,
		undefined,
		undefined,
		household,
		scenario ? new CheckInScript(household, scenario) : undefined
	);
	const chat = new ChatSession(useQueryClient(), fake, new Outbox(storage()), {
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
	let roomy = $state(false);
	let field: HTMLTextAreaElement | undefined = $state();
	let picker: HTMLInputElement | undefined = $state();
	let paletteOpen = $state(false);
	const appearance = provideAppearance(new AppearanceSetting(storage()));
	const keyLabel = commandKeyLabel(navigator.platform);

	$effect(() => {
		applyAppearance(document.documentElement, appearance.value);
	});

	const path = $derived(page.url.pathname);
	const onChat = $derived(path === '/chat');
	const place = $derived(placeOf(path));

	onMount(() => {
		const beside = window.matchMedia('(min-width: 1393px)');
		const sidebar = window.matchMedia('(min-width: 1024px)');
		const sync = () => {
			wide = beside.matches;
			roomy = sidebar.matches;
			if (wide) drawer = false;
		};
		sync();
		beside.addEventListener('change', sync);
		sidebar.addEventListener('change', sync);
		const stop = chat.start();
		return () => {
			beside.removeEventListener('change', sync);
			sidebar.removeEventListener('change', sync);
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

	/** Brings the chat into view at whatever width the window is, and puts the caret in it. */
	async function showChat() {
		if (wide) setHidden(false);
		else if (roomy) drawer = true;
		else if (!onChat) await goto(resolve('/chat'));
		queueMicrotask(() => field?.focus());
	}

	provideShell({
		openChat: (question?: string) => {
			void showChat().then(() => (question ? chat.send(question) : undefined));
		},
		attachFile: () => {
			void showChat().then(() => picker?.click());
		}
	});

	async function onPalette(action: PaletteAction) {
		if (action.kind === 'go') {
			await goto(resolve(action.href));
		} else if (action.kind === 'ask') {
			await showChat();
			await chat.send(action.text);
		} else if (action.kind === 'flow') {
			await showChat();
			if (action.flow === 'statement') picker?.click();
			else await chat.send('Log money');
		} else {
			appearance.set(nextAppearance(appearance.value));
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			paletteOpen = !paletteOpen;
		} else if (event.key === 'Escape' && drawer && !paletteOpen) {
			drawer = false;
		}
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
			<div class="brand"><Mark size={32} live /><span class="mp-hl">MyPaisa</span></div>
			<nav class="flex flex-col gap-1" aria-label="Pages">
				<button
					type="button"
					class="mp-side-i"
					aria-haspopup="dialog"
					aria-keyshortcuts="Meta+K Control+K"
					onclick={() => (paletteOpen = true)}
				>
					<NavIcon name="search" />Search<span class="kbd" aria-hidden="true">{keyLabel}</span>
				</button>
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
				bind:picker
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

<Palette
	bind:open={paletteOpen}
	appearance={appearance.value}
	onAction={(action: PaletteAction) => void onPalette(action)}
/>
