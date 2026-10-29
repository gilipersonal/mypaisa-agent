<script lang="ts">
  /* The chat, as PrototypeV4Chat draws it: day separators, the member's lines, the agent's lines and cards (one card
     per question, chips, Confirm / Cancel, a done line once saved). Buttons dispatch the actions the cards carry. */
  import type { ChatMsg } from '../state/model';
  import { dispatch } from '../state/store.svelte';
  import ChartBox from './ChartBox.svelte';
  let { list, web }: { list: ChatMsg[]; web: boolean } = $props();
  const go = (a: any) => () => dispatch(a);
</script>
<div class="pchat {web ? 'ptw' : 'pti'}">
  {#each list as m, mi (mi)}
    {#if m.k === 'ban'}<div class="pban pin"><span class="ms">replay</span><span>{m.t}</span></div>
    {:else if m.k === 'sep'}<div class="daysep pin">{m.t}</div>
    {:else if m.k === 'me'}<div class="me pin">{m.t}</div>
    {:else if m.k === 'meF'}<div class="me pmef pin">{#each m.files as f}<div class="pfile"><span class="ms">picture_as_pdf</span><span class="fx col"><span>{f.name}</span><span class="fmeta">{f.meta}</span></span></div>{/each}<span class="mft">{m.t}</span></div>
    {:else if m.k === 'typing'}<div class="ai pin"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="ptyp"><span class="typing"><i></i><i></i><i></i></span><span>{m.t}</span></div></div></div>
    {:else if m.k === 'ai'}<div class="ai pin"><div class="ai-mark"><i></i></div><div class="ai-body"><div class="ai-text">{m.t}</div>{#if m.meta}<span class="ai-meta"><span class="ms ms-s">{m.metaIcon ?? 'info'}</span><span>{m.meta}</span></span>{/if}</div></div>
    {:else if m.k === 'cards'}
      <div class="ai pin"><div class="ai-mark"><i></i></div><div class="ai-body">
        {#if m.t}<div class="ai-text">{m.t}</div>{/if}
        {#each m.cards as c}
          <div class="ccard {c.cls ?? ''}" data-card={c.title ?? c.over ?? ''}>
            <div class="ccard-h {c.cls ?? ''}">
              {#if c.chip}<div class="pchk"><span class="pchip"><span class="ms">{c.chipIcon ?? 'bolt'}</span>{c.chip}</span><span class="mp-foot mp-ink2">{c.right ?? ''}</span></div>{/if}
              {#if c.over || c.cancel}<div class="hdr"><span class="mp-over mp-ink2">{c.over ?? ''}</span>{#if c.cancel}<button class="cbtn cbtn-ghost" type="button" onclick={go(c.cancel)}>Cancel</button>{/if}</div>{/if}
              {#if c.title}<span class="fx ac gap8">{#if c.ok}<span class="ms ms-fill pok">check_circle</span>{/if}<span class="mp-hl">{c.title}</span></span>{/if}
              {#if c.tag}<span class="mp-chip chip-s {c.tagCls ?? 'mp-neutral'} ptag">{c.tag}</span>{/if}
            </div>
            <div class="ccard-b">
              {#each c.parts as p}
                {#if p.k === 'done'}<div class="done"><span>{p.key}</span><span class="fx ac gap6"><b>{p.v}</b><span class="ms">check</span></span></div>
                {:else if p.k === 'q'}<div class="fx col gap8 qblk"><span class="mp-hl">{p.t}</span><div class="wrap8">{#each p.chips as x}<button class="cbtn tight {x.cls ?? ''}" class:pulse={!!x.act} type="button" disabled={!x.act} onclick={go(x.act)}>{x.t}</button>{/each}</div></div>
                {:else if p.k === 'kv'}<div class="kv"><span>{p.key}</span><span class:mny={p.money}>{p.v}</span></div>
                {:else if p.k === 'p'}<span class="mp-foot mp-ink2 {p.cls ?? ''}">{p.t}</span>
                {:else if p.k === 'strong'}<span class="mp-hl">{p.t}</span>
                {:else if p.k === 'note'}<div class="pnote"><span class="ms">{p.icon}</span><span>{p.t}</span></div>
                {:else if p.k === 'flag'}<div class="pflag">{p.t}</div>
                {:else if p.k === 'lock'}<div class="plock"><span class="ms">lock</span><span>{p.t}</span></div>
                {:else if p.k === 'hdr'}<div class="phdr"><span class="mp-over mp-ink2">{p.t}</span><span class="mp-foot mp-ink2">{p.r ?? ''}</span></div>
                {:else if p.k === 'line'}<div class="pline">{#if p.icon}<span class="mp-icontile pl-ic"><span class="ms ms-s">{p.icon}</span></span>{/if}{#if p.lead}<span class="pl-lead">{p.lead}</span>{/if}<div class="grow"><span class="nm">{p.name}</span>{#if p.sub}<span class="sub mp-ink2">{p.sub}</span>{/if}</div><span class="fx col gap4 ae"><span class="pv mny">{p.v ?? ''}</span>{#if p.tag}<span class="mp-chip chip-s {p.tagCls ?? 'mp-neutral'}">{p.tag}</span>{/if}</span></div>
                {:else if p.k === 'amb'}<div class="pamb"><div class="fx jb gap8"><span class="fx col"><span class="nm">{p.name}</span>{#if p.sub}<span class="sub mp-ink2">{p.sub}</span>{/if}</span><span class="nm mny">{p.v}</span></div><div class="fx jb ac wrap8">{#if p.chips?.length}{#each p.chips as x}<button class="pambp {x.cls ?? ''}" type="button" disabled={!x.act} onclick={go(x.act)}>{x.t}</button>{/each}{:else}<button class="pambp {p.pillCls ?? ''}" type="button" onclick={go(p.act)}>{p.pill}{#if p.ok}<span class="ms">check</span>{/if}</button>{/if}</div></div>
                {:else if p.k === 'tiles'}<div class="ptiles">{#each p.tiles as t}<div class="ptile"><span class="sub mp-ink2">{t.key}</span><div class="fx jb bl"><b class="mny">{t.v}</b><span class="sub mp-ink2">{t.s ?? ''}</span></div>{#if t.tag}<span class="amber ptchk">{t.tag}</span>{/if}</div>{/each}</div>
                {:else if p.k === 'files'}<div class="pfiles">{#each p.files as f}<div class="pfile"><span class="ms ms-s">description</span><span>{f.name}</span></div>{/each}</div>
                {:else if p.k === 'meter'}<div class="fx col gap4"><div class="pmeter mp-track" role="img" aria-label={p.s}><span style="width: {p.w}"></span></div><span class="mp-foot mp-ink2">{p.s}</span></div>
                {:else if p.k === 'table'}<div class="ptab"><div class="ptr pth"><span>Category</span><span>Actual</span><span>Plan</span></div>{#each p.rows as r}<div class="ptr"><span>{r.c}</span><span class="mny">{r.a}</span><span class="mp-ink2 mny">{r.p}</span></div>{/each}</div>
                {:else if p.k === 'fig'}<div class="pfig"><span class="mp-num-l mny">{p.v}</span>{#if p.s}<span class="mp-foot mp-ink2">{p.s}</span>{/if}</div>
                {:else if p.k === 'big'}<button class="cbtn full {p.cls ?? ''}" type="button" disabled={!p.act} onclick={go(p.act)}>{p.t}</button>
                {:else if p.k === 'linkBtn'}<button class="cbtn cbtn-ghost {p.cls ?? ''}" type="button" disabled={!p.act} onclick={go(p.act)}>{p.t}</button>
                {:else if p.k === 'chart'}<ChartBox ch={p.ch} />
                {/if}
              {/each}
            </div>
            {#if c.acts?.length}<div class="ccard-acts {c.actsCls ?? ''}">{#each c.acts as a}<button class="cbtn {a.cls ?? ''}" class:pulse={a.cls?.includes('primary')} type="button" onclick={go(a.act)} data-act={a.t}>{#if a.icon}<span class="ms">{a.icon}</span>{/if}{a.t}</button>{/each}</div>{/if}
            {#if c.fold?.length}<div class="fx col">{#each c.fold as f}<button class="pfr {f.cls ?? ''}" type="button" onclick={go(f.act)}><span class="fx col"><span class="nm">{f.t}</span>{#if f.s}<span class="sub mp-ink2">{f.s}</span>{/if}</span><span class="ms">chevron_right</span></button>{/each}</div>{/if}
            {#if c.foot}<div class="ccard-fold quiet"><span class="fx ac gap8"><span class="ms ms-s">{c.footIcon ?? 'history'}</span>{c.foot}</span><span class="mp-foot mp-ink2">{c.at ?? ''}</span></div>{/if}
          </div>
        {/each}
        {#if m.meta}<span class="ai-meta"><span class="ms ms-s">{m.metaIcon ?? 'info'}</span><span>{m.meta}</span></span>{/if}
      </div></div>
    {/if}
  {/each}
</div>
