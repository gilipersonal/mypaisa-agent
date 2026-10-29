import { store } from '../state/store.svelte';
import { reduce } from '../state/reduce';
import { fresh } from '../state/fresh';
import type { DemoState } from '../state/model';
import { STEPS } from './script';

/** The state at the start of step i: reset, then every earlier step entered and walked. Pure, so it is testable. */
export function stateAt(i: number, base: DemoState): DemoState {
  let s = fresh({ door: base.door, w: base.w, theme: base.theme, presenter: { on: true, step: 0, done: [] } });
  for (let k = 0; k < i; k++) s = reduce(s, [...STEPS[k].enter, ...STEPS[k].run]);
  s = reduce(s, [...(STEPS[i]?.enter ?? []), { type: 'presenter', patch: { on: true, step: i } }]);
  if (STEPS[i]?.door) s = reduce(s, { type: 'door', door: STEPS[i].door });
  return s;
}
export function jumpTo(i: number) {
  store.replace(stateAt(Math.max(0, Math.min(i, STEPS.length - 1)), store.snap()));
}
/** Continue: finish what the step does if the presenter has not, then go to the next. */
export function continueStep() {
  const s = store.snap(); const i = s.presenter.step; const st = STEPS[i];
  if (!st) return;
  const exp: string[] = (st as any).expect ?? [];
  const walked = exp.length > 0 && exp.every((id) => s.applied.includes(id));
  let next = walked ? s : reduce(s, st.run);
  if (i + 1 < STEPS.length) next = reduce(next, [...STEPS[i + 1].enter, { type: 'presenter', patch: { step: i + 1 } }, ...(STEPS[i + 1].door ? [{ type: 'door', door: STEPS[i + 1].door }] : [])]);
  store.replace(next);
}
