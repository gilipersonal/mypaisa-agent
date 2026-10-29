<script lang="ts">
  import { store, dispatch, loadPrefs } from '../state/store.svelte';
  import { FRAME_H } from '../state/layout';
  import TopBar from './TopBar.svelte';
  import WebShell from './WebShell.svelte';
  import PhoneShell from './PhoneShell.svelte';
  const s = $derived(store.s);
  let top: HTMLElement | undefined = $state();
  let vw = $state(1400), vh = $state(900), th = $state(110);
  const prefs = loadPrefs();
  /* deep link: #door=iphone&theme=dark&walk=1&w=1000 */
  const q = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const init: any[] = [];
  const door = (q.get('door') ?? prefs.door) as any; if (door) init.push({ type: 'door', door });
  const theme = q.get('theme') ?? prefs.theme; if (theme) init.push({ type: 'theme', theme });
  if (prefs.w) init.push({ type: 'set', patch: { w: prefs.w } });
  if (q.get('w')) init.push({ type: 'width', door: door ?? 'web', w: +q.get('w')! });
  if (q.get('walk')) init.push({ type: 'presenter', patch: { on: true } });
  /* for screenshots and lanes: #signed=1&viewer=asha&clock=d3&page=debt&id=hdfc&priv=1 */
  if (q.get('clock')) init.push({ type: 'clock', to: q.get('clock') });
  if (q.get('signed') || q.get('page')) init.push({ type: 'signIn', method: 'Apple', page: q.get('page') ?? 'home' });
  if (q.get('viewer')) init.push({ type: 'viewer', id: q.get('viewer') });
  if (q.get('page') && q.get('id')) init.push({ type: 'nav', page: q.get('page'), params: { id: q.get('id') } });
  if (q.get('priv')) init.push({ type: 'priv', on: true });
  if (q.get('chat')) init.push({ type: 'chat', open: true });
  if (init.length) dispatch(init);
  $effect(() => {
    const ro = new ResizeObserver(() => { vw = window.innerWidth; vh = window.innerHeight; th = top?.offsetHeight ?? 110; });
    ro.observe(document.body); if (top) ro.observe(top);
    return () => ro.disconnect();
  });
  const W = $derived(s.door === 'iphone' ? 402 : s.door === 'phone' ? 390 : s.w[s.door]);
  const H = $derived(FRAME_H[s.door]);
  const bezel = $derived(s.door === 'web' ? 0 : 12);
  const sc = $derived(Math.min(1, (vw - 32 - 2 * bezel) / W, (vh - th - 44 - 2 * bezel) / H));
  const frameCls = $derived({ web: 'fr-desk', phone: 'fr-pweb', iphone: 'fr-ios', ipad: 'fr-ios fr-ipad' }[s.door]);
  let toastShown = $state<string | null>(null);
  $effect(() => { const t = s.toast; if (!t) return; toastShown = t.t; const id = setTimeout(() => (toastShown = null), 2800); return () => clearTimeout(id); });
</script>
<div class="pv4 {s.presenter.on ? 'walk' : ''}" data-door={s.door}>
  <div bind:this={top}><TopBar /></div>
  <main class="pstage">
    <div class="pframe-wrap" style="width: {(W + 2 * bezel) * sc}px; height: {(H + 2 * bezel) * sc}px">
      <div class="pframe mp {frameCls} {s.theme === 'dark' ? 't-dark' : 't-light'} {s.priv ? 'privon' : ''}" style="left: {bezel * sc}px; top: {bezel * sc}px; width: {W}px; height: {H}px; transform: scale({sc})" data-mo-frame-root>
        {#if s.door === 'iphone'}<PhoneShell />{:else}<WebShell />{/if}
        {#if toastShown}<div class="ptoast mp-toast" role="status">{toastShown}</div>{/if}
        {#if s.undo}<div class="ptoast mp-toast undo-t" role="status">{s.undo.label} <button class="plink" type="button" onclick={() => dispatch({ type: 'undo' })}>Undo</button></div>{/if}
      </div>
    </div>
  </main>
</div>
<style>
  :global(.fr-ipad) { border-radius: 28px; }
  :global(.undo-t) { pointer-events: auto; bottom: 170px; }
</style>
