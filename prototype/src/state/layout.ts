/* The width rule, one function (ARCHITECTURE §9.1; lesson 23's phrase): "beside every screen from about 1133 pt, a
   sheet away from about 600 to 1133 pt, and a tab in a compact window (every iPhone, a folded foldable, Slide Over)".
   An iPhone is always compact, in either orientation. */
import type { DoorId } from './model';
import type { Layout } from './registry';

export const FRAME_H: Record<DoorId, number> = { web: 900, phone: 844, iphone: 874, ipad: 820 };
export function layoutFor(door: DoorId, w: number): Layout {
  const h = FRAME_H[door];
  if (door === 'iphone' || w < 600) return { nav: 'tabs', chat: 'tab', compact: true, w, h };
  /* the DS shell (tokens.css .mp-shell) shows the sidebar from 1024; the chat follows the width rule */
  if (w < 1133) return { nav: w >= 1024 ? 'sidebar' : 'tabs', chat: 'sheet', compact: false, w, h };
  return { nav: 'sidebar', chat: 'column', compact: false, w, h };
}
