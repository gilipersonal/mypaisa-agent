import { mask } from '../lib/format';
/** Privacy mode: every amount in every string of a page or a message becomes its sign and dots. */
export function deepMask<T>(x: T, on: boolean): T {
  if (!on) return x;
  const walk = (v: any): any => {
    if (typeof v === 'string') return mask(v, true);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object' && !(v instanceof Function)) {
      const o: any = {};
      for (const k in v) o[k] = k === 'act' || k === 'type' || k === 'ch' ? v[k] : typeof v[k] === 'function' ? v[k] : walk(v[k]);
      return o;
    }
    return v;
  };
  return walk(x);
}
