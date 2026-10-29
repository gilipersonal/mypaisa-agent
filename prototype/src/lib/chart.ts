/* The chart maths of Prototype v4 (prototype-v4.js: scaleX, scaleY, line, band, grid, interp, chart): SVG paths in a
   0..100 box stretched with preserveAspectRatio="none", strokes kept by the kit's non-scaling-stroke rule (lesson 37:
   every stroke in its own SVG, no shared <use>). Labels and dots are HTML laid over the box by percentage. */
export type Pt = [number, number];
export const scaleX = (x0: number, x1: number) => (x: number) => ((x - x0) / (x1 - x0)) * 100;
export const scaleY = (y0: number, y1: number) => (y: number) => 100 - ((y - y0) / (y1 - y0)) * 100;
export function line(pts: Pt[], X: (x: number) => number, Y: (y: number) => number): string {
  return pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2)).join(' ');
}
export function band(lo: Pt[], hi: Pt[], X: (x: number) => number, Y: (y: number) => number): string {
  return line(hi, X, Y) + ' ' + lo.slice().reverse().map((p) => 'L' + X(p[0]).toFixed(2) + ' ' + Y(p[1]).toFixed(2)).join(' ') + ' Z';
}
export function grid(vals: number[], Y: (y: number) => number): string {
  return vals.map((v) => 'M0 ' + Y(v).toFixed(2) + ' L100 ' + Y(v).toFixed(2)).join(' ');
}
export function interp(pts: Pt[], x: number): number {
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

export interface ChartSpec {
  h: string; dGrid: string; dBand: string; dDash: string; dLine: string;
  ys: { top: string; t: string }[];
  xs: { l: string; t: string; cls: string }[];
  dots: { l: string; tp: string; cls: string }[];
  lbls: { l: string; tp: string; t: string; cls: string }[];
  leg: { t: string; cls: string }[];
  ann?: { l: string; y: string; mid: string; lo: string; hi: string } | null;
}
export interface ChartIn {
  x0: number; x1: number; y0: number; y1: number; h?: number;
  line?: Pt[]; dash?: Pt[]; lo?: Pt[]; hi?: Pt[];
  gridAt?: number[]; yLabel?: (v: number) => string;
  xTicks?: { x: number; t: string; cls?: string }[];
  dots?: { x: number; y: number; cls?: string }[];
  lbls?: { x: number; y: number; t: string; cls?: string }[];
  leg?: { t: string; cls: string }[];
}
export function chart(o: ChartIn): ChartSpec {
  const X = scaleX(o.x0, o.x1), Y = scaleY(o.y0, o.y1);
  const g = o.gridAt ?? [];
  return {
    h: (o.h ?? 160) + 'px',
    dGrid: grid(g, Y),
    dBand: o.lo && o.hi ? band(o.lo, o.hi, X, Y) : '',
    dDash: o.dash ? line(o.dash, X, Y) : '',
    dLine: o.line ? line(o.line, X, Y) : '',
    ys: g.map((v) => ({ top: Y(v).toFixed(2) + '%', t: o.yLabel ? o.yLabel(v) : String(v) })),
    xs: (o.xTicks ?? []).map((t) => ({ l: X(t.x).toFixed(2) + '%', t: t.t, cls: t.cls ?? '' })),
    dots: (o.dots ?? []).map((d) => ({ l: X(d.x).toFixed(2) + '%', tp: Y(d.y).toFixed(2) + '%', cls: d.cls ?? '' })),
    lbls: (o.lbls ?? []).map((d) => ({ l: X(d.x).toFixed(2) + '%', tp: Y(d.y).toFixed(2) + '%', t: d.t, cls: d.cls ?? '' })),
    leg: o.leg ?? [],
    ann: null,
  };
}
