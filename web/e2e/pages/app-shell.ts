/** The app's shell (Shell 1a), selected by its test ids alone (web/src/lib/test-ids.ts): the tab bar under 1024 px, the
 * sidebar from 1024 px (tokens.css, `@container app (min-width: 1024px)`), and the chat: its own page under 600 px, a
 * sheet over the page from 600 px (AppShell.svelte, `SHEET_FROM`). The widths are the app's; a spec asserts the shell
 * keeps them, so a moved breakpoint fails here rather than being followed. */
import { expect, type Locator, type Page } from '@playwright/test';
import { TestIDs, type TestID } from '#lib/test-ids.ts';

/** From this width the sidebar holds the pages and the tab bar is gone. */
export const SIDEBAR_FROM = 1024;
/** From this width the chat is a sheet over the page; under it, the chat's own page at /chat. */
export const SHEET_FROM = 600;

/** A page the shell's navigation opens: by its tab under 1024 px, by its sidebar link from 1024 px. */
export interface Place {
	name: string;
	path: string;
	/** Its tab, if the tab bar has one. */
	tab?: TestID;
	/** Its sidebar link, if the sidebar has one. */
	side?: TestID;
}

/** Every page the navigation reaches, in the order each bar draws them. Chat is not here: it is a page or a sheet by
 * width, and `AppShell.chat()` opens it. */
export const PLACES: readonly Place[] = [
	{ name: 'Home', path: '/', tab: TestIDs.tabHome, side: TestIDs.sideHome },
	{ name: 'Assets', path: '/assets', tab: TestIDs.tabAssets, side: TestIDs.sideAssets },
	{ name: 'Debts', path: '/debts', side: TestIDs.sideDebts },
	{ name: 'Budget', path: '/budget', side: TestIDs.sideBudget },
	{ name: 'Projection', path: '/projection', tab: TestIDs.tabProjection, side: TestIDs.sideProjection },
	{ name: 'Activity', path: '/activity', side: TestIDs.sideActivity },
	{ name: 'Audit', path: '/audit', side: TestIDs.sideAudit },
	{ name: 'You', path: '/you', side: TestIDs.sideYou },
	{ name: 'Admin center', path: '/admin', side: TestIDs.sideAdmin },
	{ name: 'More', path: '/more', tab: TestIDs.tabMore }
];

export function place(name: string): Place {
	const found = PLACES.find((p) => p.name === name);
	if (!found) throw new Error(`the shell has no place called ${name}`);
	return found;
}

/** The ids each bar draws, for "exactly one is current". */
const TAB_IDS: readonly TestID[] = [TestIDs.tabChat, ...PLACES.flatMap((p) => (p.tab ? [p.tab] : []))];
const SIDE_IDS: readonly TestID[] = [TestIDs.sideChat, ...PLACES.flatMap((p) => (p.side ? [p.side] : []))];

export class AppShell {
	constructor(readonly page: Page) {}

	width(): number {
		const size = this.page.viewportSize();
		if (!size) throw new Error('the page has no viewport size');
		return size.width;
	}

	/** The sidebar holds the pages at this width (else the tab bar does). */
	usesSidebar(): boolean {
		return this.width() >= SIDEBAR_FROM;
	}

	/** The chat is a sheet over the page at this width (else its own page). */
	chatIsSheet(): boolean {
		return this.width() >= SHEET_FROM;
	}

	/** The places the navigation shown at this width reaches. */
	places(): Place[] {
		return PLACES.filter((p) => (this.usesSidebar() ? p.side : p.tab));
	}

	/** The control that opens a place at this width. */
	entry(p: Place): Locator {
		const id = this.usesSidebar() ? p.side : p.tab;
		if (!id) throw new Error(`${p.name} has no ${this.usesSidebar() ? 'sidebar link' : 'tab'}`);
		return this.page.getByTestId(id);
	}

	/** The Chat control at this width: the sidebar's from 1024 px, the tab bar's under it. */
	chatEntry(): Locator {
		return this.page.getByTestId(this.usesSidebar() ? TestIDs.sideChat : TestIDs.tabChat);
	}

	/** Every entry in the bar shown at this width that says it is the current page. */
	current(): Locator {
		const ids = this.usesSidebar() ? SIDE_IDS : TAB_IDS;
		return this.page.locator(ids.map((id) => `[data-testid="${id}"][aria-current="page"]`).join(', '));
	}

	/** The chat as a sheet (from 600 px): the dialog named Chat. The sheet has no mp.* id; its role and name are what
	 * AppShell.svelte gives it. Closed, it stays laid out (so Playwright calls it visible) but sits below the window and
	 * is inert: `expectSheetOpen` and `expectSheetClosed` assert those. */
	sheet(): Locator {
		return this.page.getByRole('dialog', { name: 'Chat' });
	}

	/** The sheet is up: in the window, nearly whole (it may still be rising), and not inert. */
	async expectSheetOpen(): Promise<void> {
		await expect(this.sheet(), 'the chat sheet is in the window').toBeInViewport({ ratio: 0.9 });
		await expect(this.sheet(), 'the open sheet takes input').not.toHaveAttribute('inert');
		await expect(this.page.locator('main#main'), 'the page under the open sheet is inert').toHaveAttribute('inert');
	}

	/** The sheet is put away: below the window and inert, and the page takes input again. */
	async expectSheetClosed(): Promise<void> {
		await expect(this.sheet(), 'the closed sheet is out of the window').not.toBeInViewport();
		await expect(this.sheet(), 'the closed sheet takes no input').toHaveAttribute('inert');
		await expect(this.page.locator('main#main')).not.toHaveAttribute('inert');
	}

	/** Asserts the bar for this width shows and the other is gone. */
	async expectNavForWidth(): Promise<void> {
		const home = place('Home');
		if (this.usesSidebar()) {
			await expect(this.page.getByTestId(TestIDs.sideHome), 'the sidebar, from 1024 px').toBeVisible();
			await expect(this.page.getByTestId(TestIDs.tabHome), 'no tab bar from 1024 px').toBeHidden();
		} else {
			await expect(this.page.getByTestId(TestIDs.tabHome), 'the tab bar, under 1024 px').toBeVisible();
			await expect(this.page.getByTestId(TestIDs.sideHome), 'no sidebar under 1024 px').toBeHidden();
		}
		await expect(this.entry(home)).toBeVisible();
	}

	/** Opens a place by the navigation shown at this width, and waits for its address. */
	async goTo(p: Place): Promise<void> {
		await this.entry(p).click();
		await expect(this.page).toHaveURL(p.path);
	}

	/** Opens the chat the way this width does: under 600 px the Chat tab opens /chat; from 600 px Chat opens the sheet
	 * over the page, which is asserted shown. Returns what holds the chat. */
	async chat(): Promise<Locator> {
		const entry = this.chatEntry();
		if (!this.chatIsSheet()) {
			await entry.click();
			await expect(this.page).toHaveURL('/chat');
			await expect(entry).toHaveAttribute('aria-current', 'page');
			const region = this.page.getByRole('region', { name: 'Chat' });
			await expect(region).toBeVisible();
			return region;
		}
		await this.expectSheetClosed();
		await entry.click();
		await this.expectSheetOpen();
		await expect(entry).toHaveAttribute('aria-expanded', 'true');
		return this.sheet();
	}
}
