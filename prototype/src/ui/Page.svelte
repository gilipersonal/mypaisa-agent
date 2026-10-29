<script lang="ts">
  /* The page beside the chat, as PrototypeV4Pages draws it: a head, then columns of blocks (a hero, chips, cards of
     parts). Every page of every area is a PageSpec rendered here, so all doors share one markup and one stylesheet. */
  import type { PageSpec } from '../state/registry';
  import { dispatch } from '../state/store.svelte';
  import EditPart from './EditPart.svelte';
  import ChartBox from './ChartBox.svelte';
  let { pg, web, eye = false, eyeOn = false }: { pg: PageSpec; web: boolean; eye?: boolean; eyeOn?: boolean } = $props();
  const go = (a: any) => () => dispatch(a);
  const segs = (list: any[] | undefined) => list ?? [];
</script>
<div class="ppage {web ? 'pweb' : 'pios'}">
  <div class={web ? 'mp-pagepad' : 'ppad'}>
    {#if pg.crumb}<button class="crumb" type="button" onclick={go(pg.crumb.act ?? { type: 'back' })}><span class="ms">chevron_left</span>{pg.crumb.t}</button>{/if}
    <header class="mp-pagehead phead" class:withtabs={!!pg.tabs?.length}>
      <div class="fx col gap4"><div class="ptitle">{pg.title}</div>{#if pg.sub}<div class="mp-foot mp-ink2">{pg.sub}</div>{/if}</div>
      {#if pg.tabs?.length}
        <nav class="ptabs" aria-label={pg.title}><div class="utabs" role="tablist">{#each pg.tabs as t}<button class="utab" class:on={t.on} type="button" role="tab" aria-selected={!!t.on} onclick={go(t.act)}>{t.t}</button>{/each}</div></nav>
      {/if}
      <div class="hctl">
        {#each [['Horizon', pg.ctrls?.hz], ['Month', pg.ctrls?.month], ['Whose view', pg.ctrls?.whose], ['Currency', pg.ctrls?.ccy]] as [lbl, list]}
          {#if segs(list as any[]).length}<div class="mp-seg" role="group" aria-label={lbl as string}>{#each list as any[] as s}<span class="segw"><button class="mp-seg-i" class:on={s.on} type="button" onclick={go(s.act)}>{s.t}</button></span>{/each}</div>{/if}
        {/each}
        {#if pg.ctrls?.tm}<button class="tmsw" type="button" onclick={go({ type: 'todaysMoney' })}>Today's money<span class="mp-switch"><span class="mp-switch-k"></span></span></button>{/if}
        {#if web && eye}<button class="iconbtn" type="button" aria-label="Privacy mode" onclick={go({ type: 'priv' })}><span class="ms">{eyeOn ? 'visibility_off' : 'visibility'}</span></button>{/if}
        {#if pg.headChip}<span class="mp-chip mp-neutral hchipx">{pg.headChip}</span>{/if}
      </div>
    </header>
    {#if pg.banner}<div class="pban2"><span class="ms ms-s">receipt_long</span><span>{pg.banner}</span></div>{/if}
    <div class="mp-cols {pg.colsCls ?? ''}">
      {#each pg.cols as col}
        <div class="mp-col">
          {#each col as bk}
            {#if bk.k === 'hero'}
              <div class="mp-hero phero">
                {#if bk.whose?.length}<div class="mp-seg pseg-w" role="group" aria-label="Whose view">{#each bk.whose as s}<span class="segw"><button class="mp-seg-i" class:on={s.on} type="button" onclick={go(s.act)}>{s.t}</button></span>{/each}</div>{/if}
                <div class="fx jb ac gap8"><span class="mp-over mp-hero-2">{bk.over}</span>
                  {#if bk.right}<span class="mp-chip chip-s {bk.rightUp ? 'upchip' : 'dnchip'}">{bk.right}</span>{/if}
                  {#if bk.seg?.length}<div class="mp-seg" role="group" aria-label="Currency">{#each bk.seg as s}<span class="segw"><button class="mp-seg-i" class:on={s.on} type="button" onclick={go(s.act)}>{s.t}</button></span>{/each}</div>{/if}
                </div>
                <div class="fx gap8 bl"><span class="mp-num-hero mny" data-hero>{bk.big}</span>{#if bk.unit}<span class="mp-sub mp-hero-2">{bk.unit}</span>{/if}</div>
                {#if bk.deltaT}<div class="pdelta"><span class="hup mny">{bk.deltaUp ?? ''}</span> <span class="mp-hero-2">{bk.deltaT}</span></div>{/if}
                {#if bk.sub}<span class="mp-sub mp-hero-2">{bk.sub}</span>{/if}
                {#if bk.ch}<ChartBox ch={bk.ch} cls="onhero" />{/if}
                {#if bk.stats?.length}<div class="pstats n{bk.stats.length}">{#each bk.stats as st}<div><span class="mp-foot mp-hero-2">{st.key}</span><span class="pstat-v mny">{st.v}</span><span class="mp-foot mp-hero-2">{st.s ?? ''}</span></div>{/each}</div>{/if}
                {#if bk.rate}<div class="rate mp-foot mp-hero-2"><span class="ms ms-s">currency_exchange</span><span>{bk.rate}</span></div>{/if}
                {#if bk.live}<div class="hlive"><span class="ms ms-s">bolt</span><span>{bk.live}</span></div>{/if}
              </div>
            {:else if bk.k === 'chips'}
              <div class="pchips">{#each bk.chips as c}<button class="pchipb" type="button" onclick={go(c.act)}><span class="ms">chat_bubble</span>{c.t}</button>{/each}</div>
            {:else}
              <div class="mp-card pcard {bk.cls ?? ''}">
                {#if bk.title}<div class="ttl"><span class="mp-hl">{bk.title}</span><span class="mp-foot mp-ink2">{bk.right ?? ''}</span></div>{/if}
                {#each bk.parts as pt}
                  {#if pt.k === 'kv'}<div class="kvr"><span>{pt.key}</span><span class:mny={pt.money}>{pt.v}</span></div>
                  {:else if pt.k === 'p'}<p class="pp mp-foot {pt.cls ?? ''}">{pt.t}</p>
                  {:else if pt.k === 'note'}<div class="pnote2"><span class="ms">{pt.icon}</span><span>{pt.t}</span></div>
                  {:else if pt.k === 'lock'}<div class="plock2"><span class="ms">lock</span><span>{pt.t}</span></div>
                  {:else if pt.k === 'sec'}<div class="psec"><span class="mp-over mp-ink2">{pt.t}</span><span class="mp-foot mp-ink2 mny">{pt.r ?? ''}</span></div>
                  {:else if pt.k === 'bar'}<div class="pbar"><div class="fx jb bl gap8"><span class="mp-sub mp-w6">{pt.name}</span><span class="mp-sub mp-w6 mny">{pt.v}</span></div><div class="mbar mp-track"><span class={pt.fill ?? 'f-blue'} style="width: {pt.w}"></span></div>{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}</div>
                  {:else if pt.k === 'stack'}<div class="stk">{#each pt.segs as sg}<span class={sg.c} style="width: {sg.w}"></span>{/each}</div>
                  {:else if pt.k === 'row'}
                    <button class="prow {pt.cls ?? ''}" type="button" onclick={go(pt.act ?? (pt.toggle ? null : { type: 'nope' }))} data-row={pt.name}>
                      {#if pt.sw}<span class="sw {pt.sw}"></span>{/if}
                      {#if pt.lead}<span class="mp-row-lead plead">{pt.lead}</span>{/if}
                      {#if pt.icon}<span class="mp-icontile pic"><span class="ms ms-s">{pt.icon}</span></span>{/if}
                      <span class="prow-m"><span class="mp-sub mp-w6">{pt.name}</span>{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}{#if pt.sub2}<span class="mp-foot mp-ink2">{pt.sub2}</span>{/if}{#if pt.tags?.length}<span class="ptags">{#each pt.tags as tg}<span class="mp-chip chip-s {tg.cls ?? 'mp-neutral'}">{#if tg.icon}<span class="ms">{tg.icon}</span>{/if}{tg.t}</span>{/each}</span>{/if}</span>
                      {#if pt.v || pt.v2}<span class="prow-v"><span class="mp-sub mp-w6 {pt.vcls ?? 'mny'}">{pt.v ?? ''}</span>{#if pt.v2}<span class="mp-foot mp-ink2 mny">{pt.v2}</span>{/if}</span>{/if}
                      {#if pt.toggle}<span class="mp-switch" class:on={pt.on}><span class="mp-switch-k"></span></span>{/if}
                      {#if pt.chev}<span class="ms mp-ink2">chevron_right</span>{/if}
                    </button>
                  {:else if pt.k === 'grid'}<div class="kvg">{#each pt.cells as c}<div><span class="mp-foot mp-ink2">{c.key}</span><span class="fx ac"><span class="mp-hl mny" class:up={c.up}>{c.v}</span>{#if c.pen}<span class="ms pen">edit</span>{/if}</span><span class="mp-foot mp-ink2">{c.s ?? ''}</span></div>{/each}</div>
                  {:else if pt.k === 'due'}<button class="drow" type="button" onclick={go(pt.act ?? { type: 'nope' })}><span class="dtile" class:today={pt.today}><span class="mp-cap">{pt.a}</span><span class="mp-hl">{pt.b}</span><span class="mp-cap">{pt.c}</span></span><span class="prow-m"><span class="mp-sub mp-w6">{pt.name}</span>{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}</span>{#if pt.v}<span class="mp-sub mp-w6 mny">{pt.v}</span>{/if}</button>
                  {:else if pt.k === 'tags'}<div class="ptags">{#each pt.tags as tg}<span class="mp-chip {tg.cls ?? 'mp-neutral'}">{#if tg.icon}<span class="ms">{tg.icon}</span>{/if}{tg.t}</span>{/each}</div>
                  {:else if pt.k === 'big'}<div class="fx col gap2"><div class="pbig"><button class="pfigb {pt.act ? 'tapme' : ''} {pt.cls ?? ''}" type="button" onclick={go(pt.act)}><span class="mp-num-l mny">{pt.big}</span>{#if pt.pen}<span class="ms pen">edit</span>{/if}</button></div>{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}</div>
                  {:else if pt.k === 'edit'}<EditPart {pt} />
                  {:else if pt.k === 'ok'}<div class="pok2"><span class="ms">task_alt</span><span class="fx col gap4"><span>{pt.t}</span>{#if pt.link}<button class="plink" type="button" onclick={go(pt.act)}>{pt.link}</button>{/if}</span></div>
                  {:else if pt.k === 'chart'}<ChartBox ch={pt.ch} cls="oncard" />
                  {:else if pt.k === 'budHead'}<div class="bud bud-h mp-over mp-ink2"><span>Category</span><span class="r">Actual</span><span class="r">Plan</span></div>
                  {:else if pt.k === 'bud'}<button class="bud" type="button" onclick={go(pt.act ?? { type: 'nope' })}><span class="fx col gap4"><span class="mp-sub mp-w6">{pt.name}</span><span class="mbar thin mp-track"><span class={pt.over ? 'f-amber' : 'f-blue'} style="width: {pt.w}"></span></span></span><span class="fx col r"><span class="mp-sub mp-w6 mny">{pt.a}</span></span><span class="mp-sub tapme2 mny">{pt.p}</span></button>
                  {:else if pt.k === 'runHead'}<div class="run rhd mp-over mp-ink2"><span class="r-tm">Time</span><span class="r-mn">Run</span><span class="r-md">Model</span><span class="r-tk">Tokens</span><span class="r-cs">Cost</span><span class="r-ot">Outcome</span></div>
                  {:else if pt.k === 'run'}<button class="run {pt.cls ?? ''}" type="button" onclick={go(pt.act ?? { type: 'nope' })}><span class="r-tm mp-sub mp-w6">{pt.time}</span><span class="r-mn"><span class="mp-sub mp-w6">{pt.name}</span>{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}</span><span class="r-md mp-foot">{pt.model ?? ''}</span><span class="r-tk mp-foot">{pt.tokens ?? ''}</span><span class="r-cs mp-sub mp-w6">{pt.cost ?? ''}</span><span class="r-ot out {pt.ocls ?? ''}">{pt.outcome ?? ''}</span></button>
                  {:else if pt.k === 'step'}<div class="step"><span class="mp-foot mp-w6">{pt.time}</span><span class="fx col gap2"><span class={pt.lc ?? 'mp-sub mp-w6'}>{pt.l}</span>{#if pt.t}<span class="mp-foot mp-ink2">{pt.t}</span>{/if}</span></div>
                  {:else if pt.k === 'call'}<div class="call"><span class="fx jb ac"><span class="mp-sub mp-w6">{pt.m}</span><span class="mp-sub mp-w6">{pt.cost}</span></span>{#if pt.t}<span class="mp-foot mp-ink2">{pt.t}</span>{/if}</div>
                  {:else if pt.k === 'tool'}<div class="trow"><span class="tl ink">{pt.n}</span><span class="mp-foot mp-ink2 r">{pt.ms}</span></div>
                  {:else if pt.k === 'meter'}<div class="fx col gap8"><div class="fx gap8 bl"><span class="mp-num-l">{pt.big}</span><span class="mp-sub mp-ink2">{pt.bsub ?? ''}</span></div><div class="mwrap"><div class="meter mp-track" role="img" aria-label={pt.label ?? pt.big}><span class="mfill" style="width: {pt.w}"></span></div>{#each pt.steps ?? [] as t}<i class="tick" style="left: {t}%"></i>{/each}</div>{#if pt.steps?.length}<div class="ticks" aria-hidden="true">{#each pt.steps as t}<span style="left: {t}%">{t}%</span>{/each}</div>{/if}{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}</div>
                  {:else if pt.k === 'pill'}<div class="ppill">{#if pt.icon}<span class="mp-icontile pic"><span class="ms ms-s">{pt.icon}</span></span>{/if}<span class="prow-m"><span class="mp-sub mp-w6">{pt.name}</span>{#if pt.sub}<span class="mp-foot mp-ink2">{pt.sub}</span>{/if}</span><span class="pval"><span class="mny">{pt.v ?? ''}</span></span></div>
                  {:else if pt.k === 'btn'}<button class="mp-btn mp-btn-tinted mp-btn-small {pt.cls ?? ''}" type="button" onclick={go(pt.act)}>{#if pt.icon}<span class="ms">{pt.icon}</span>{/if}{pt.t}</button>
                  {:else if pt.k === 'link'}<button class="plink {pt.cls ?? ''}" type="button" onclick={go(pt.act)}>{pt.t}<span class="ms ms-s">chevron_right</span></button>
                  {:else if pt.k === 'table'}
                    <div class="mtab"><div class="mtr mth">{#each pt.head as h}<span>{h}</span>{/each}</div>{#each pt.rows as r}<button class="mtr {r.cls ?? ''}" type="button" onclick={go(r.act ?? { type: 'nope' })}>{#each r.cells as c}<span>{c}</span>{/each}</button>{/each}</div>
                  {/if}
                {/each}
              </div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
    <p class="pfoot">{pg.foot ?? 'Illustrative figures. Figures from the engine and the price registry.'}</p>
  </div>
</div>
