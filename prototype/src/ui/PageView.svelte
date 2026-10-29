<script lang="ts">
  import { store } from '../state/store.svelte';
  import { ctxOf } from '../state/ctx';
  import { PAGES } from '../state/registry';
  import { deepMask } from './mask';
  import Page from './Page.svelte';
  let { web }: { web: boolean } = $props();
  const s = $derived(store.s);
  const def = $derived(PAGES[s.route.page] ?? PAGES['home']);
  const pg = $derived.by(() => {
    if (!def) return { title: 'Nothing here yet', cols: [] };
    const ctx = ctxOf(s);
    if (def.meta.adminOnly && ctx.asha) return { title: def.meta.title, sub: 'Only the admin sees this page.', cols: [[{ k: 'card', parts: [{ k: 'lock', t: 'The Admin center is the admin\'s alone. Asha sees her own records, the household\'s figures and the chat.' }] }]] } as any;
    try { return def.build(s, ctx); } catch (e) { console.error(e); return { title: def.meta.title, sub: 'This page could not be drawn: ' + String(e), cols: [] }; }
  });
  const shown = $derived(deepMask(pg, s.priv));
  let el: HTMLDivElement | undefined = $state();
  $effect(() => { s.route.page; JSON.stringify(s.route.params ?? {}); if (el) el.scrollTop = 0; });
</script>
<div class="pscroll" data-scroll="page" data-page={s.route.page} bind:this={el}><div class={web ? '' : 'pagepad'}><Page pg={shown} {web} eye={true} eyeOn={s.priv} /></div></div>
