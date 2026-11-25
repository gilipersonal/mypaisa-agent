<script lang="ts">
	// The web app's shell (MA-199, picked on MA-193; the chat as a sheet, MA-357, picked in MA-355 a 1a): the sidebar
	// from 1024 px, the page, and the chat. From 600 px the chat is a sheet over the page, a window centred in the
	// browser window (Arun, 25 Nov 2026), 600 px wide, the page dimmed and the sidebar not; it opens from the sidebar's
	// Chat, the tab bar's Chat under 1024 px, ⌘J on a Mac, a page's Ask or Update, or ⌘K, and closes on Esc, Close, a
	// click on the dimmed page, its grabber, or ⌘J again, giving the focus back to what opened it. Under 600 px the Chat
	// tab is the chat's page. Under 1024 px the tab bar holds Chat, Home, Assets, Projection and More (Arun, 5 Nov 2026,
	// MA-334). The wealth
	// pages read a stub of the design figure set (MA-208), which the scripted chat's Confirm writes to, and privacy mode
	// is one switch for every page and the chat. ⌘K, or Search at the top of the sidebar, opens the palette (MA-353).
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { onMount, tick, untrack, type Snippet } from 'svelte';
	import { chatKeys } from '#lib/api/queries.ts';
	import { CheckInScript, checkInScenario } from '#lib/chat/checkins.ts';
	import { FakeTransport } from '#lib/chat/fake.ts';
	import { browserSession } from '#lib/auth/session.ts';
	import { Outbox } from '#lib/chat/outbox.ts';
	import { ChatSession, provideChat } from '#lib/chat/session.svelte.ts';
	import { emptyTimeline, type Timeline } from '#lib/chat/timeline.ts';
	import Mark from '#lib/components/brand/Mark.svelte';
	import ChatPanel from '#lib/components/chat/ChatPanel.svelte';
	import { freshThread } from '#lib/components/chat/thread.ts';
	import { HeaderChoice, provideHeaderChoice } from '#lib/components/header/choice.svelte.ts';
	import { provideWealth } from '#lib/components/wealth/context.ts';
	import { forecastRunOf } from '#lib/stub/forecast.ts';
	import { StubHousehold } from '#lib/stub/household.ts';
	import { StubWealthSource, signedInAs, startsEmpty } from '#lib/stub/source.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import { provideShell } from './actions.ts';
	import { applyAppearance } from './appearance.ts';
	import { AppearanceSetting, provideAppearance } from './appearance.svelte.ts';
	import NavIcon from './NavIcon.svelte';
	import { ADMIN, CHAT_TAB, PAGES, TABS, isCurrentTab, placeOf } from './nav.ts';
	import Palette from './Palette.svelte';
	import { commandKeyLabel, nextAppearance, type PaletteAction } from './palette.ts';
	import { PrivacyMode, providePrivacy } from './privacy.svelte.ts';
	import {
		ChatSheet,
		SHEET_FROM,
		chatKeyLabel,
		dimDuring,
		isChatShortcut,
		isMac,
		pullCloses,
		pullOffset,
		sheetFrame,
		trapIndex,
		type Focusable
	} from './sheet.svelte.ts';

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
	// ?as= first (a dev switch), else whoever the stub session signed in on this browser (MA-185: Asha after her join)
	const signedIn = signedInAs(window.location.search) ?? browserSession().current()?.member;
	const household = new StubHousehold({
		empty: startsEmpty(window.location.search),
		...(signedIn ? { me: signedIn } : {})
	});
	// ?forecast=pot or ?forecast=wedding opens the Budget forecast on a later state of the evening it draws (MA-262).
	provideWealth(new StubWealthSource(household, undefined, forecastRunOf(window.location.search)));
	providePrivacy(new PrivacyMode(storage()));
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
	const queries = useQueryClient();
	const chat = new ChatSession(queries, fake, new Outbox(storage()), {
		online: () => navigator.onLine,
		addEventListener: (type, fn) => {
			window.addEventListener(type, fn);
		},
		removeEventListener: (type, fn) => {
			window.removeEventListener(type, fn);
		}
	});
	provideChat(chat);

	const sheet = new ChatSheet();
	/** The window is 600 px or wider: the chat is the sheet, centred in the window. */
	let roomy = $state(false);
	let innerWidth = $state(0);
	let innerHeight = $state(0);
	const frame = $derived(sheetFrame(innerWidth, innerHeight));
	let pulled = $state(0);
	let pulling = $state(false);
	let sheetHeight = $state(0);
	let sheetEl: HTMLElement | undefined = $state();
	let chatButton: HTMLButtonElement | undefined = $state();
	let chatTab: HTMLButtonElement | undefined = $state();
	let field: HTMLTextAreaElement | undefined = $state();
	let picker: HTMLInputElement | undefined = $state();
	let paletteOpen = $state(false);
	const appearance = provideAppearance(new AppearanceSetting(storage()));
	const keyLabel = commandKeyLabel(navigator.platform);
	const mac = isMac(navigator.platform);
	const chatKey = chatKeyLabel(navigator.platform);
	const admin = household.members.find((m) => m.id === household.me)?.admin ?? true;
	const open = $derived(roomy && sheet.open);

	$effect(() => {
		applyAppearance(document.documentElement, appearance.value);
	});

	const path = $derived(page.url.pathname);
	const onChat = $derived(path === '/chat');
	const place = $derived(placeOf(path));

	onMount(() => {
		const wide = window.matchMedia(`(min-width: ${String(SHEET_FROM)}px)`);
		const sync = () => {
			roomy = wide.matches;
			if (!roomy) {
				sheet.drop();
				pulled = 0;
			}
		};
		sync();
		wide.addEventListener('change', sync);
		const stop = chat.start();
		return () => {
			wide.removeEventListener('change', sync);
			stop();
		};
	});

	// The Chat tab's address, from 600 px: Home, with the sheet open over it.
	$effect(() => {
		if (onChat && roomy) untrack(() => void openSheet(undefined, false));
	});

	function focusable(el: Element | null | undefined): Focusable | undefined {
		return el instanceof HTMLElement && el !== document.body && !sheetEl?.contains(el) ? el : undefined;
	}

	/** Where the focus starts in the sheet: the message, so typing works at once; or, when a page opened it on a
	 * check-in, that card's first answer. */
	function focusInside(fromPage: boolean) {
		if (fromPage && sheetEl) {
			const rows = [...sheetEl.querySelectorAll<HTMLElement>('.msgs-row')];
			const last = rows.sort((x, y) => Number(y.dataset.index) - Number(x.dataset.index))[0];
			const answer = last
				?.querySelector(`[data-testid="${TestIDs.chatCheckIn}"]`)
				?.querySelector<HTMLButtonElement>('.cc-a button, .cc-b button.mp-btn');
			if (answer) {
				answer.focus({ preventScroll: true });
				return;
			}
		}
		field?.focus({ preventScroll: true });
	}

	async function openSheet(opener: Element | null | undefined, fromPage: boolean) {
		pulled = 0;
		if (!sheet.open) sheet.show(focusable(opener));
		await tick();
		// The sheet is laid out while closed, so its conversation is already measured: the focus can go in at once.
		requestAnimationFrame(() => {
			focusInside(fromPage);
		});
	}

	function closeSheet() {
		const back = sheet.hide();
		pulled = 0;
		pulling = false;
		// The page is inert until the sheet's close is drawn, and an inert control takes no focus: give it back after.
		// With no opener to go back to, the Chat that shows takes it: the sidebar's, or the tab bar's under 1024 px.
		void tick().then(() => {
			(back ?? [chatButton, chatTab].find((b) => b && b.getClientRects().length > 0))?.focus();
		});
	}

	function toggleSheet(opener: Element | null) {
		if (sheet.open) closeSheet();
		else void openSheet(opener, false);
	}

	/** Brings the chat into view at whatever width the window is: the sheet from 600 px, the Chat tab under it. */
	async function showChat(fromPage: boolean) {
		if (roomy) {
			await openSheet(document.activeElement, fromPage);
			return;
		}
		if (!onChat) await goto(resolve('/chat'));
		await tick();
		field?.focus();
	}

	provideShell({
		openChat: (question?: string) => {
			void showChat(question === undefined).then(() => (question ? chat.send(question) : undefined));
		},
		attachFile: () => {
			void showChat(false).then(() => picker?.click());
		}
	});

	/** New conversation: an empty thread; a reply still being written stops where it is first. */
	async function newConversation() {
		await chat.stop();
		queries.setQueryData<Timeline>(chatKeys.timeline, (t) => freshThread(t ?? emptyTimeline()));
		await tick();
		field?.focus({ preventScroll: true });
	}

	function onPull(dy: number) {
		pulling = true;
		pulled = pullOffset(dy);
	}

	function onLetGo(dy: number, ms: number) {
		pulling = false;
		if (pullCloses(dy, ms)) closeSheet();
		else pulled = 0;
	}

	/** Tab stays inside the sheet while it is open. */
	function trap(event: KeyboardEvent) {
		if (event.key !== 'Tab' || !open || !sheetEl) return;
		const stops = [
			...sheetEl.querySelectorAll<HTMLElement>(
				'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
			)
		].filter((el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0);
		const current = stops.indexOf(document.activeElement as HTMLElement);
		const next = trapIndex(stops.length, current, event.shiftKey);
		if (next === -1) return;
		event.preventDefault();
		stops[next]?.focus();
	}

	async function onPalette(action: PaletteAction) {
		if (action.kind === 'go') {
			await goto(resolve(action.href));
		} else if (action.kind === 'ask') {
			await showChat(false);
			await chat.send(action.text);
		} else if (action.kind === 'flow') {
			await showChat(false);
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
		} else if (paletteOpen) {
			// the palette's own keys while it is up
		} else if (isChatShortcut(event, mac)) {
			event.preventDefault();
			if (roomy) toggleSheet(document.activeElement);
			else void showChat(false);
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			closeSheet();
		}
	}
</script>

<svelte:window {onkeydown} bind:innerWidth bind:innerHeight />

<a
	href="#main"
	class="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:min-h-11 focus:px-4 focus:py-3"
>
	Skip to content
</a>

<div class="mp mp-app mp-root">
	<div class="mp-shell shl" class:v-chat={onChat}>
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
					bind:this={chatButton}
					type="button"
					class="mp-side-i"
					class:pr={open}
					aria-haspopup="dialog"
					aria-controls="chat-sheet"
					aria-expanded={open}
					aria-keyshortcuts={chatKey ? 'Meta+J' : undefined}
					onclick={(event: MouseEvent) => {
						toggleSheet(event.currentTarget as Element);
					}}
				>
					<NavIcon name="message-circle" />Chat{#if chatKey}<span class="kbd" aria-hidden="true">{chatKey}</span>{/if}
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

		<main id="main" tabindex="-1" class="mp-shell-main main outline-none" inert={open}>
			{@render children()}
		</main>

		<!-- The dimmed page: a click closes the sheet. For the pointer only; the keyboard has Esc and Close. -->
		<div
			class="mp-scrim scrim"
			class:open
			class:pulling
			style:--dim={dimDuring(pulled, sheetHeight)}
			title="Click to close the chat"
			aria-hidden="true"
			onclick={closeSheet}
		></div>

		<section
			bind:this={sheetEl}
			bind:clientHeight={sheetHeight}
			id="chat-sheet"
			class="csheet"
			class:open
			class:pulling
			style:--pull="{pulled}px"
			style:--away={roomy ? `${String(frame.away)}px` : undefined}
			style:left={roomy ? `${String(frame.left)}px` : undefined}
			style:top={roomy ? `${String(frame.top)}px` : undefined}
			style:width={roomy ? `${String(frame.width)}px` : undefined}
			style:height={roomy ? `${String(frame.height)}px` : undefined}
			role={roomy ? 'dialog' : 'region'}
			aria-modal={roomy ? true : undefined}
			aria-labelledby={roomy ? 'chat-title' : undefined}
			aria-label={roomy ? undefined : 'Chat'}
			inert={roomy && !sheet.open}
			onkeydown={trap}
		>
			<ChatPanel
				place={roomy ? 'sheet' : 'tab'}
				context={onChat ? undefined : place?.label}
				{admin}
				titleId="chat-title"
				bind:field
				bind:picker
				onClose={closeSheet}
				onNew={() => void newConversation()}
				{onPull}
				{onLetGo}
			/>
		</section>

		<!-- Under the dim while the sheet is open (600 to 1023 px), so out of reach until it closes. -->
		<nav class="mp-tabbar mp-shell-tabs tabs" aria-label="Sections" inert={open}>
			{#each TABS as t (t.href)}
				{@const on = isCurrentTab(t, path, roomy)}
				{#if t === CHAT_TAB && roomy}
					<!-- From 600 px the Chat tab opens the sheet over the page it is on, as the sidebar's Chat does. -->
					<button
						bind:this={chatTab}
						type="button"
						class="mp-tab"
						class:pr={open}
						data-testid={t.testId}
						aria-haspopup="dialog"
						aria-controls="chat-sheet"
						aria-expanded={open}
						onclick={(event: MouseEvent) => {
							toggleSheet(event.currentTarget as Element);
						}}
					>
						<NavIcon name={t.icon} />{t.label}
					</button>
				{:else}
					<a
						class="mp-tab"
						class:on
						href={resolve(t.href)}
						data-testid={t.testId}
						aria-current={on ? 'page' : undefined}
					>
						<NavIcon name={t.icon} />{t.label}
					</a>
				{/if}
			{/each}
		</nav>
	</div>
</div>

<Palette
	bind:open={paletteOpen}
	appearance={appearance.value}
	onAction={(action: PaletteAction) => void onPalette(action)}
/>
