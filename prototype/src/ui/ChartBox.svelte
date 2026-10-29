<script lang="ts">
  import type { ChartSpec } from '../lib/chart';
  let { ch, cls = '' }: { ch: ChartSpec; cls?: string } = $props();
</script>
<div class="pchart {cls}">
  <div class="pc-box" style="height: {ch.h}">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="pc-grid" d={ch.dGrid}></path><path class="pc-band" d={ch.dBand}></path><path class="pc-dash" d={ch.dDash}></path><path class="pc-line" d={ch.dLine}></path></svg>
    {#each ch.ys as y}<span class="pc-y mny" style="top: {y.top}">{y.t}</span>{/each}
    {#each ch.dots as d}<span class="pc-dot {d.cls}" style="left: {d.l}; top: {d.tp}"></span>{/each}
    {#each ch.lbls as l}<span class="pc-lbl mny {l.cls}" style="left: {l.l}; top: {l.tp}">{l.t}</span>{/each}
    {#if ch.ann}<span class="pc-ann" style="left: {ch.ann.l}"><b>{ch.ann.y}</b> · middle path <b class="mny">{ch.ann.mid}</b><br />8 in 10: <span class="mny">{ch.ann.lo}</span> to <span class="mny">{ch.ann.hi}</span></span>{/if}
  </div>
  <div class="pc-x">{#each ch.xs as x}<span class={x.cls} style="left: {x.l}">{x.t}</span>{/each}</div>
  {#if ch.leg.length}<div class="pc-leg">{#each ch.leg as g}<span class="fx ac gap6"><i class="pc-k {g.cls}"></i>{g.t}</span>{/each}</div>{/if}
</div>
