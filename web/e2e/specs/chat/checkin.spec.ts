/** A check-in in the chat (MA-304 AC6, @regression): signed in, with the EMI check-in due, the card asks; Paid saves it
 * and offers Undo; Undo reverses it and the card asks again, saying it was undone. */
import { checkpoint, expect, test } from '../../fixtures/test.ts';
import { AppShell } from '../../pages/app-shell.ts';
import { CheckInCard } from '../../pages/checkin.ts';

test.describe('a check-in', () => {
	test('MA-304 AC6: the check-in card shows, Paid saves it and Undo reverses it @regression', async ({
		signedInPage: page
	}) => {
		const shell = new AppShell(page);
		const c = new CheckInCard(page);
		await c.openEmi();
		if (shell.chatIsSheet()) await shell.expectSheetOpen();
		await expect(c.card).toHaveCount(1);
		await expect(c.card).toBeVisible();
		await expect(c.confirm).toBeVisible();
		await expect(c.undo).toHaveCount(0);
		const asked = await c.card.getAttribute('aria-label');
		expect(asked, 'the card is named by its question').toBeTruthy();
		await checkpoint(page, 'check-in asked');

		await c.confirm.click();
		await expect(c.undo).toBeVisible();
		await expect(c.confirm, 'once saved, Paid is gone').toHaveCount(0);
		await expect(c.card, 'the answer edits the card in place').toHaveCount(1);
		await expect(c.card).not.toHaveAttribute('aria-label', asked ?? '');
		await checkpoint(page, 'check-in paid');

		await c.undo.click();
		await expect(c.confirm, 'undone, the card asks again').toBeVisible();
		await expect(c.undo).toHaveCount(0);
		await expect(c.card).toHaveCount(1);
		await expect(c.card).toHaveAttribute('aria-label', asked ?? '');
		await expect(c.card).toContainText('Undone at');
		await checkpoint(page, 'check-in undone');
	});

	test('MA-304 AC6: Paid pressed twice at once saves once @regression', async ({ signedInPage: page }) => {
		const c = new CheckInCard(page);
		await c.openEmi();
		await expect(c.confirm).toBeVisible();
		await c.confirm.dblclick();
		await expect(c.undo).toHaveCount(1);
		await expect(c.undo).toBeVisible();
		await expect(c.confirm).toHaveCount(0);
		await expect(c.card).toHaveCount(1);
		await expect(c.card).not.toContainText('Undone at');
		await checkpoint(page, 'check-in paid once');
	});
});
