/** The records the scripted chat can add to the stub household: what its Confirm card proposes, as a record. */
import type { Decimal } from '#lib/formatting/money.ts';
import type { Share, StubAsset } from './household.ts';

const OWNERS: Record<string, readonly Share[]> = {
	arun: [['arun', 100]],
	asha: [['asha', 100]],
	joint: [
		['arun', 50],
		['asha', 50]
	]
};

/** "£5,000 in Monzo savings": instant access, so liquid; whose it is from the chat's answer. */
export function monzoSavings(amount: Decimal, owner: string): StubAsset {
	return {
		id: 'monzo_savings',
		kind: 'savings_account',
		name: 'Instant access savings · Monzo',
		country: 'UK',
		ccy: 'GBP',
		owners: OWNERS[owner] ?? OWNERS.arun ?? [],
		value: Number(amount),
		liquidity: 'liquid'
	};
}
