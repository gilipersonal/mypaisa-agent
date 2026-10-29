/* Money and text formatting, ported from Prototype v4 (docs/design/app-v1/prototype-v4.js) so the demo prints
   figures exactly as the boards do: pounds grouped en-GB, rupees in lakh and crore, half-to-even rounding as the
   figure set rounds, and privacy masking of every amount. */
export const FX = 112.5; // ₹ per £, ECB reference cross-rate of Fri 23 Oct 2026 (illustrative)

/** Half to even, as Python's round() and the figure set round. */
export function rhe(x: number): number {
  const f = Math.floor(x);
  return Math.abs(x - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(x);
}
export function grp(n: number): string {
  return Math.round(Math.abs(n)).toLocaleString('en-GB');
}
export function gbp(n: number): string {
  return (n < 0 ? '−£' : '£') + grp(n);
}
export function gbp2(n: number): string {
  return (n < 0 ? '−£' : '£') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** Indian grouping: ₹1,10,00,000. */
export function inr(n: number): string {
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const body = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return (neg ? '−₹' : '₹') + body;
}
export function usd(n: number, dp = 2): string {
  return '$' + n.toFixed(dp);
}
export function money(n: number, ccy: string): string {
  return ccy === 'INR' ? inr(n) : ccy === 'USD' ? usd(n) : gbp(n);
}
export function toGbp(x: number, ccy: string): number {
  return ccy === 'INR' ? x / FX : x;
}
export function pct(a: number, b: number): string {
  return b ? Math.round((a / b) * 100) + '%' : '0%';
}
/** Privacy mode: every amount becomes its currency sign and dots, as the boards draw it. */
export function mask(t: string, priv: boolean): string {
  return priv ? String(t).replace(/[−+]?([£₹$])\s?[\d,]+(\.\d+)?(k|m)?/g, '$1•••') : t;
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Mon 26 Oct" from an ISO date or date-time. */
export function dayLabel(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00Z');
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export function hhmm(iso: string): string {
  return iso.length >= 16 ? iso.slice(11, 16) : iso;
}
