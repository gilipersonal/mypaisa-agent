<script lang="ts">
  /* The iPhone door, as PrototypeV4Phone draws shell 1a, Chat first: the glass strip, the chat, the composer, and the
     Liquid Glass tab bar (Chat · Home · Activity · You, Search apart). Pages push from Home and You. */
  import { dispatch, store } from '../state/store.svelte';
  import { ctxOf } from '../state/ctx';
  import { tabItems } from './nav';
  import { APPLE } from './marks';
  import { gbp, inr, mask } from '../lib/format';
  import { PAGES } from '../state/registry';
  import PageView from './PageView.svelte';
  import ChatPane from './ChatPane.svelte';
  import Composer from './Composer.svelte';
  const s = $derived(store.s);
  const ctx = $derived(ctxOf(s));
  const isChat = $derived(s.route.page === 'chat');
  const isRoot = $derived(['home', 'activity', 'you'].includes(s.route.page));
  const net = $derived(s.ccy === 'INR' ? inr(ctx.T.net_inr) : gbp(ctx.T.net_gbp));
  const go = (a: any) => () => dispatch(a);
</script>
<div class="pi mp {s.theme === 'dark' ? 't-dark' : 't-light'}" class:priv={s.priv}>
  <div class="island"></div>
  <div class="sbar"><span>{s.time}</span><span class="sbar-ic"><span class="ms">signal_cellular_alt</span><span class="ms">wifi</span><span class="ms">battery_horiz_075</span></span></div>
  {#if !s.signedIn}
    <div class="wel">
      <div class="wel-mid"><div class="appicon appicon-default"><span class="mark"></span></div><span class="mp-t1">MyPaisa</span><span class="mp-body wel-line">Everything your household owns and owes, in one calm place.</span></div>
      <div class="wel-bot">
        <button class="siwa pulse" type="button" onclick={go({ type: 'signIn', method: 'Apple', page: 'chat' })} data-act="signin-apple">{@html APPLE}Sign in with Apple</button>
        <button class="gsi" type="button" onclick={go({ type: 'signIn', method: 'Google', page: 'chat' })}><span class="glogo">G</span><span>Sign in with Google</span></button>
        <span class="mp-foot mp-ink2 ctr">No password. Your household's records stay private.</span>
      </div>
    </div>
  {:else if isChat}
    <button class="strip lg" type="button" onclick={go({ type: 'nav', page: 'home' })}><div class="ai-mark z1"><i></i></div><div class="fx col f1 z1"><span class="mp-foot mp-ink2">Household net worth</span><span class="fx ac gap8"><span class="strip-n mny">{mask(net, s.priv)}</span></span></div><span class="ms z1 mp-ink2">chevron_right</span></button>
    <div class="body"><div class="fadet"></div><ChatPane web={false} /></div>
    <div class="edge-bot"></div>
    <Composer ios={true} />
  {:else}
    <div class="nav">
      {#if !isRoot}<button class="gbtn lg" type="button" aria-label="Back" onclick={go(s.history.length ? { type: 'back' } : { type: 'nav', page: PAGES[s.route.page]?.meta.parent ?? 'home' })}><span class="ms z1">chevron_left</span></button>{/if}
      <span class="navsp"></span>
      {#if isRoot}<span class="fx ac gap8"><button class="gbtn lg" type="button" aria-label="Privacy mode" onclick={go({ type: 'priv' })}><span class="ms z1">{s.priv ? 'visibility_off' : 'visibility'}</span></button><button class="gtext lg" type="button" onclick={go({ type: 'nav', page: 'chat' })}><span class="ms z1">chat_bubble</span><span class="z1">Ask</span></button></span>
      {:else}<span class="ggroup lg"><button class="gbtn" type="button" aria-label="Privacy mode" onclick={go({ type: 'priv' })}><span class="ms z1">{s.priv ? 'visibility_off' : 'visibility'}</span></button><button class="gbtn" type="button" aria-label="Ask" onclick={go({ type: 'nav', page: 'chat' })}><span class="ms z1">chat_bubble</span></button></span>{/if}
    </div>
    <div class="body"><PageView web={false} /></div>
    <div class="edge-bot"></div>
  {/if}
  {#if s.signedIn}
    <div class="tabdock"><div class="tabs lg">{#each tabItems(s) as n}<span class="tabw"><button class="tab" class:on={n.on} type="button" onclick={go({ type: 'nav', page: n.id })} data-tab={n.id}><span class="ms">{n.icon}</span>{n.label}</button></span>{/each}</div><button class="tabsearch lg" type="button" aria-label="Search" onclick={go({ type: 'nope', t: 'Search comes with phase 8 (MA-14); not drawn in this demo.' })}><span class="ms z1">search</span></button></div>
  {/if}
  <div class="homebar"></div>
</div>
