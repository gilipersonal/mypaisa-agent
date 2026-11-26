/** Home (MA-199): selected by its test ids alone (web/src/lib/test-ids.ts). */
import type { Locator, Page } from '@playwright/test';
import { TestIDs } from '#lib/test-ids.ts';

export class HomePage {
	readonly hero: Locator;

	constructor(readonly page: Page) {
		this.hero = page.getByTestId(TestIDs.homeHero);
	}

	async open(): Promise<void> {
		await this.page.goto('/');
	}
}
