/** The shell's smoke set (MA-304): signed in, Home shows its hero; the navigation shown at each width opens each page,
 * and Chat opens the chat (its page under 600 px, the sheet from 600 px); signed out, the app sends you to sign in.
 * `@smoke` runs in under 2 minutes (.claude/rules/testing.md); `@sweep` is the opt-in width sweep. */
import { TestIDs } from '#lib/test-ids.ts';
import { checkpoint, expect, test } from '../../fixtures/test.ts';
import { AppShell, SIDEBAR_FROM, place } from '../../pages/app-shell.ts';
import { HomePage } from '../../pages/home.ts';

test.describe('the shell', () => {
	test('MA-304 AC1: signed in, Home shows the net worth hero @smoke', async ({ signedInPage: page }) => {
		await expect(page).toHaveURL('/');
		await expect(new HomePage(page).hero).toBeVisible();
		await checkpoint(page, 'home');
	});

	test('MA-304 AC2: the tab bar shows under 1024 px and the sidebar from 1024 px @smoke', async ({
		signedInPage: page
	}) => {
		await new AppShell(page).expectNavForWidth();
	});

	test('MA-304 AC2: each page in the navigation opens it, and only it is current @smoke', async ({
		signedInPage: page
	}) => {
		const shell = new AppShell(page);
		const places = shell.places();
		// The tab bar has four pages and Chat; the sidebar has every page, the Admin center last, and no More.
		expect(places.map((p) => p.name)).toEqual(
			shell.usesSidebar()
				? ['Home', 'Assets', 'Debts', 'Budget', 'Projection', 'Activity', 'Audit', 'You', 'Admin center']
				: ['Home', 'Assets', 'Projection', 'More']
		);
		// From Home, every other page and then Home again, so a page that stays current after leaving it is caught.
		for (const p of [...places.filter((x) => x.name !== 'Home'), place('Home')]) {
			await test.step(p.name, async () => {
				await shell.goTo(p);
				await expect(shell.entry(p)).toHaveAttribute('aria-current', 'page');
				await expect(shell.current(), 'one page is current').toHaveCount(1);
				await checkpoint(page, `nav ${p.name}`);
			});
		}
	});

	test('MA-304 AC2: Chat opens the chat, its page under 600 px and a sheet from 600 px @smoke', async ({
		signedInPage: page
	}) => {
		const shell = new AppShell(page);
		await shell.chat();
		await checkpoint(page, 'chat');
		if (!shell.chatIsSheet()) return;
		// The sheet lies over the page it was opened on, and Esc puts it away again, leaving that page.
		await expect(page).toHaveURL('/');
		await page.keyboard.press('Escape');
		await shell.expectSheetClosed();
		await expect(shell.chatEntry()).toHaveAttribute('aria-expanded', 'false');
		await expect(new HomePage(page).hero).toBeVisible();
	});

	test('MA-304 AC3: signed out, every page of the app goes to sign in @smoke', async ({ page }) => {
		for (const path of ['/', '/projection', '/more', '/chat', '/admin']) {
			await page.goto(path);
			await expect(page).toHaveURL('/sign-in');
			await expect(page.getByTestId(TestIDs.signInView)).toBeVisible();
		}
		await checkpoint(page, 'sign in');
	});

	test('MA-304 AC4: Home fits the window, with no sideways scroll @sweep', async ({ signedInPage: page }) => {
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow, 'pixels Home overflows the window by').toBeLessThanOrEqual(0);
		await checkpoint(page, 'home at width');
	});

	test(`MA-304 AC4: the tab bar shows under ${String(SIDEBAR_FROM)} px and the sidebar from it @sweep`, async ({
		signedInPage: page
	}) => {
		await new AppShell(page).expectNavForWidth();
	});
});
