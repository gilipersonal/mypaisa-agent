/** The stub household's sums, as the figure set works them out (docs/design/figures/README.md): everything in pounds at
 * the set's one rate, what is owned and owed each rounded once, net worth their difference, and every split rounded by
 * largest remainder so its parts always add up to the total shown. A stand-in for the engine (MA-191), kept honest by
 * the figure set's own totals in its test. */
import type { RecordCurrency, Share, StubAsset, StubHousehold } from './household.ts';

/** `household`, or a member's id for that member's share of every record. */
export type View = string;
export const HOUSEHOLD: View = 'household';

export type Liquidity = 'liquid' | 'fixed' | 'locked';

export interface MemberNet {
	id: string;
	name: string;
	net: number;
}

export interface Totals {
	own: number;
	owe: number;
	net: number;
	uk: number;
	ind: number;
	/** India's own rupee sum: what is owned there less what is owed there. */
	indInr: number;
	/** Each member's share of the net worth; empty in a member's own view. */
	members: MemberNet[];
	liquid: number;
	fixed: number;
	locked: number;
	nLiquid: number;
	nFixed: number;
	nAssets: number;
	nDebts: number;
}

export function toGbp(amount: number, ccy: RecordCurrency, fx: number): number {
	return ccy === 'INR' ? amount / fx : amount;
}

/** How much of a record counts in a view: all of it for the household, the member's share in theirs. */
export function weight(owners: readonly Share[], view: View): number {
	if (view === HOUSEHOLD) return 1;
	return (owners.find(([member]) => member === view)?.[1] ?? 0) / 100;
}

/** Whole numbers that add up to `total`: each part rounded down, then the largest remainders take what is left. */
export function largestRemainder(parts: readonly number[], total: number): number[] {
	const floors = parts.map((p) => Math.floor(p));
	let left = total - floors.reduce((a, b) => a + b, 0);
	const order = parts.map((p, i) => ({ i, r: p - Math.floor(p) })).sort((a, b) => b.r - a.r);
	for (const { i } of order) {
		if (left <= 0) break;
		floors[i] = (floors[i] ?? 0) + 1;
		left -= 1;
	}
	return floors;
}

/** Liquid now, paying out on a day (a fixed term), or locked: a home, or a pension until an age. */
export function liquidityOf(asset: StubAsset): Liquidity {
	if (asset.liquidity === 'liquid') return 'liquid';
	return asset.matures ? 'fixed' : 'locked';
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

export function totals(h: StubHousehold, view: View): Totals {
	const assets = h.assets.map((a) => ({ a, w: weight(a.owners, view) })).filter((x) => x.w > 0);
	const debts = h.debts.map((d) => ({ d, w: weight(d.owners, view) })).filter((x) => x.w > 0);
	const assetGbp = (x: (typeof assets)[number]) => toGbp(x.a.value, x.a.ccy, h.fx) * x.w;
	const debtGbp = (x: (typeof debts)[number]) => toGbp(x.d.balance, x.d.ccy, h.fx) * x.w;

	// The household's split by member, rounded so it adds up; a member's own view shows the same figure for them, and
	// what they owe is what they own less it.
	const household =
		Math.round(sum(h.assets.map((a) => toGbp(a.value, a.ccy, h.fx)))) -
		Math.round(sum(h.debts.map((d) => toGbp(d.balance, d.ccy, h.fx))));
	const raw = h.members.map(
		(m) =>
			sum(h.assets.map((a) => toGbp(a.value, a.ccy, h.fx) * weight(a.owners, m.id))) -
			sum(h.debts.map((d) => toGbp(d.balance, d.ccy, h.fx) * weight(d.owners, m.id)))
	);
	const split = largestRemainder(raw, household);
	const mine = h.members.findIndex((m) => m.id === view);

	const own = Math.round(sum(assets.map(assetGbp)));
	const net = mine === -1 ? own - Math.round(sum(debts.map(debtGbp))) : (split[mine] ?? 0);
	const owe = own - net;

	const netIn = (country: string) =>
		sum(assets.filter((x) => x.a.country === country).map(assetGbp)) -
		sum(debts.filter((x) => x.d.country === country).map(debtGbp));
	const [uk = 0, ind = 0] = largestRemainder([netIn('UK'), netIn('IN')], net);
	const indInr =
		Math.round(sum(assets.filter((x) => x.a.ccy === 'INR').map((x) => x.a.value * x.w))) -
		Math.round(sum(debts.filter((x) => x.d.ccy === 'INR').map((x) => x.d.balance * x.w)));

	const members: MemberNet[] =
		view === HOUSEHOLD ? h.members.map((m, i) => ({ id: m.id, name: m.name, net: split[i] ?? 0 })) : [];

	const of = (kind: Liquidity) => assets.filter((x) => liquidityOf(x.a) === kind);
	const liquid = Math.round(sum(of('liquid').map(assetGbp)));
	const fixed = Math.round(sum(of('fixed').map(assetGbp)));

	return {
		own,
		owe,
		net,
		uk,
		ind,
		indInr,
		members,
		liquid,
		fixed,
		locked: own - liquid - fixed,
		nLiquid: of('liquid').length,
		nFixed: of('fixed').length,
		nAssets: assets.length,
		nDebts: debts.length
	};
}
