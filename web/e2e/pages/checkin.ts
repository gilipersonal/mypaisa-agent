/** A check-in card in the chat (MA-205, card 1b): selected by its test ids (web/src/lib/test-ids.ts). The app's
 * `?checkin=emi` switch has the scripted chat put November's EMI check-in in the chat; the switch is read in the build
 * as served (AppShell.svelte, checkInScenario), not only in dev. */
import type { Locator, Page } from '@playwright/test';
import { TestIDs } from '#lib/test-ids.ts';

export class CheckInCard {
	readonly card: Locator;
	readonly confirm: Locator;
	readonly undo: Locator;
	readonly more: Locator;

	constructor(readonly page: Page) {
		this.card = page.getByTestId(TestIDs.chatCheckIn);
		this.confirm = this.card.getByTestId(TestIDs.chatCheckInConfirm);
		this.undo = this.card.getByTestId(TestIDs.chatCheckInUndo);
		this.more = this.card.getByTestId(TestIDs.chatCheckInMore);
	}

	/** Opens the chat with the EMI check-in in it: its page under 600 px, the sheet over Home from 600 px. */
	async openEmi(): Promise<void> {
		await this.page.goto('/chat?checkin=emi');
	}
}
