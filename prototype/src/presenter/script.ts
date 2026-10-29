/* The walk (presenter mode): the household story as steps. Each step's `run` is the actions walking it produces, so
   jumping to step n is reset + every earlier step's run, and equals walking there (tested). Filled at M6 from the
   flows each area registers. */
import type { Action, DoorId } from '../state/model';

export interface Step {
  id: string; chapter: string; title: string;
  /** what to say while it plays */
  talk: string;
  /** the guide line: what to tap */
  guide: string;
  door?: DoorId;
  /** actions that set the step up (route, clock), applied on arrival */
  enter: Action[];
  /** actions walking the step produces, applied on Continue or when jumping past it */
  run: Action[];
  /** a CSS selector for the control that should pulse */
  next?: string;
}
export const STEPS: Step[] = [];
export function addSteps(list: Step[]) { STEPS.push(...list); }
