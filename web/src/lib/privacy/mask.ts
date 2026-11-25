/** Privacy mode (ARCHITECTURE §13): every amount on every screen and notification is hidden behind a fixed mask, so
 * neither the figure nor its length shows. The mask keeps the currency, so the screen still reads. */
import { formatMoney, type Currency, type Decimal, type MoneyOptions } from '#lib/formatting/money.ts';

export const MASK = '••••';

export function maskedMoney(amount: Decimal, currency: Currency, privacy: boolean, options: MoneyOptions = {}): string {
	if (!privacy) return formatMoney(amount, currency, options);
	const symbol = formatMoney('0', currency, { whole: true }).replace(/[\d\s.,]/g, '');
	return `${symbol}${MASK}`;
}

/** An amount written into a sentence: an optional sign, a currency symbol, then digits with their commas and point. */
const AMOUNT = /[−+-]?([£₹$€])\s?\d+(?:,\d+)*(?:\.\d+)?/g;

/** Words the agent or the engine wrote, with every amount in them behind the mask: "Put £•••• in Monzo savings". */
export function maskAmounts(text: string, privacy: boolean): string {
	return privacy ? text.replace(AMOUNT, (_all, symbol: string) => `${symbol}${MASK}`) : text;
}

/** The same for what a screen reader hears: an amount is "hidden", never read out. */
export function hideAmounts(text: string, privacy: boolean): string {
	return privacy ? text.replace(AMOUNT, 'hidden') : text;
}
