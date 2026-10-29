/* The one store: a $state holding the current DemoState, replaced on every dispatch by the pure reducer. */
import type { Action, DemoState } from './model';
import { reduce } from './reduce';
import { fresh } from './fresh';
import { AREAS } from './registry';

class Store {
  s = $state<DemoState>(fresh());
  log: Action[] = [];
  dispatch = (a: Action | Action[] | null | undefined) => {
    if (!a) return;
    const list = Array.isArray(a) ? a : [a];
    if (!list.length) return;
    this.log.push(...list);
    this.s = reduce($state.snapshot(this.s) as DemoState, list);
    persist(this.s);
  };
  replace(s: DemoState) { this.s = s; }
  /** a plain copy of the state (the reducer clones, and a $state proxy cannot be cloned) */
  snap(): DemoState { return $state.snapshot(this.s) as DemoState; }
}
export const store = new Store();
export const dispatch = store.dispatch;

function persist(s: DemoState) {
  try { localStorage.setItem('mp-demo-prefs', JSON.stringify({ door: s.door, theme: s.theme, w: s.w })); } catch { /* private mode */ }
}
export function loadPrefs(): Partial<DemoState> {
  try { return JSON.parse(localStorage.getItem('mp-demo-prefs') || '{}'); } catch { return {}; }
}
export const areasLoaded = () => AREAS.length;
