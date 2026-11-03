/** Privacy mode (ARCHITECTURE §13): every amount on every screen and notification is hidden behind a fixed mask, so
 * neither the figure nor its length shows. The mask keeps the currency, so the screen still reads. */
import { formatMoney, type Currency, type Decimal, type MoneyOptions } from '#lib/formatting/money.ts';

export const MASK = '••••';

export function maskedMoney(amount: Decimal, currency: Currency, privacy: boolean, options: MoneyOptions = {}): string {
	if (!privacy) return formatMoney(amount, currency, options);
	const symbol = formatMoney('0', currency, { whole: true }).replace(/[\d\s.,]/g, '');
	return `${symbol}${MASK}`;
}
