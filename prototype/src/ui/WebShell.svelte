<script lang="ts">
  /* The web door and the iPad, as PrototypeV4Web draws Web v4 · Shell and chat's option 1a: the sidebar, the page
     and the chat. Where the chat goes follows the width rule (state/layout.ts): beside the page from 1133, a sheet
     from 600, a tab below. */
  import { dispatch, store } from '../state/store.svelte';
  import { ctxOf } from '../state/ctx';
  import { sideItems, tabItems } from './nav';
  import { MARK, MARK_HERO, APPLE, GOOGLE } from './marks';
  import { gbp, inr, mask } from '../lib/format';
  import PageView from './PageView.svelte';
  import ChatPane from './ChatPane.svelte';
  import Composer from './Composer.svelte';
  const s = $derived(store.s);
  const ctx = $derived(ctxOf(s));
  const L = $derived(ctx.layout);
  const ipad = $derived(s.door === 'ipad');
  const onChat = $derived(L.chat === 'tab' && s.route.page === 'chat');
  const showChat = $derived(L.chat === 'column' || onChat || (L.chat === 'sheet' && s.chatOpen));
  const user = $derived(s.viewer === 'asha' ? 'Asha' : 'Arun');
  const net = $derived(s.ccy === 'INR' ? inr(ctx.T.net_inr) : gbp(ctx.T.net_gbp));
  const go = (a: any) => () => dispatch(a);
</script>
<div class="pw mp mp-app {s.theme === 'dark' ? 't-dark' : 't-light'} {ipad ? 'ipad-door' : ''}" class:priv={s.priv}>
  {#if s.door === 'web'}<div class="chrome"><span class="dots"><i></i><i></i><i></i></span><span class="url"><span class="ms">lock</span>dashboard.mypaisapp.com</span><span class="chrome-r"></span></div>{/if}
  {#if s.door === 'phone' || ipad}<div class="sbar"><span>{s.time}</span><span class="sbar-ic"><span class="ms">signal_cellular_alt</span><span class="ms">wifi</span><span class="ms">battery_horiz_075</span></span></div>{/if}
  {#if !s.signedIn}
    {#if s.door === 'phone'}<div class="purl"><span class="ms">lock</span>dashboard.mypaisapp.com</div>{/if}
    <div class="login">
      <div class="lhero">
        <div class="fx ac gap12">{@html MARK_HERO}<span class="mp-t2">MyPaisa</span></div>
        <div class="fx col gap16"><h1 class="tagline">Everything your household owns and owes, in one calm place.</h1><p class="mp-callout mp-hero-2" style="margin: 0; max-width: 440px">The UK and India together, kept up to date by talking to MyPaisa. The chat is here too, beside every page.</p></div>
        <div class="mp-foot mp-hero-2">Illustrative</div>
      </div>
      <div class="lform"><div class="lbox">
        <div class="mp-t1">Sign in</div>
        <div class="mp-sub mp-ink2" style="margin-bottom: 12px">With the account you use in the MyPaisa app.</div>
        <button class="siwa pulse" type="button" onclick={go({ type: 'signIn', method: 'Apple' })} data-act="signin-apple">{@html APPLE}Sign in with Apple</button>
        <button class="gsi" type="button" onclick={go({ type: 'signIn', method: 'Google' })}>{@html GOOGLE}Sign in with Google</button>
        <button class="mp-btn mp-btn-plain" type="button" onclick={go({ type: 'nope', t: 'A passkey works after the first sign-in with Apple or Google.' })}><span class="ms">passkey</span>Sign in with a passkey</button>
        <div class="lnote mp-foot mp-ink2" style="margin-top: 8px"><span class="ms ms-s">key</span><span>No password. A passkey works after your first sign-in with Apple or Google.</span></div>
      </div></div>
    </div>
  {:else}
    <div class="shl"><div class="mp-shell lay-{L.chat} nav-{L.nav}" class:v-chat={onChat} style="height: 100%">
      <aside class="mp-side mp-shell-side side" aria-label="MyPaisa">
        <div class="fx ac gap12 brand">{@html MARK}<span class="mp-hl">MyPaisa</span></div>
        {#each sideItems(s) as n}<button class="mp-side-i" class:on={n.on} type="button" onclick={go({ type: 'nav', page: n.id })} data-nav={n.id}><span class="ms" class:ms-fill={n.on}>{n.icon}</span>{n.label}</button>{/each}
        <div class="f1"></div>
        {#if L.chat === 'sheet'}<button class="mp-side-i" type="button" onclick={go({ type: 'chat' })}><span class="ms">chat_bubble</span>Chat</button>{/if}
        <div class="mp-foot mp-ink2 side-ft">{user}<br />Signed in with Apple</div>
      </aside>
      <main class="mp-shell-main main"><PageView web={true} /></main>
      {#if showChat}
        <section class="chatcol" aria-label="Chat">
          <div class="chd"><div class="fx col"><span class="mp-hl">Chat</span><span class="mp-foot mp-ink2">{ctx.dayLabel} · {s.time}</span></div>
            {#if L.chat === 'sheet'}<button class="iconbtn" type="button" aria-label="Close the chat" onclick={go({ type: 'chat', open: false })}><span class="ms">close</span></button>{/if}</div>
          <button class="wstrip" type="button" onclick={go({ type: 'nav', page: 'home' })}><span class="fx col f1"><span class="mp-foot mp-ink2">Household net worth</span><span class="fx ac gap8"><span class="wstrip-n mny">{mask(net, s.priv)}</span></span></span><span class="ms mp-ink2">chevron_right</span></button>
          <div class="chwrap"><ChatPane web={true} /></div>
          <Composer />
        </section>
      {/if}
      {#if L.chat === 'sheet' && !s.chatOpen}<button class="askfab" type="button" onclick={go({ type: 'chat', open: true })}><span class="ms">chat_bubble</span>Ask</button>{/if}
      <nav class="mp-tabbar mp-shell-tabs wtabs" aria-label="Sections">{#each tabItems(s) as n}<span class="tabw"><button class="mp-tab" class:on={n.on} type="button" onclick={n.id === 'chat' && L.chat === 'sheet' ? go({ type: 'chat', open: true }) : go({ type: 'nav', page: n.id })} data-tab={n.id}><span class="ms" class:ms-fill={n.on}>{n.icon}</span>{n.label}</button></span>{/each}</nav>
    </div></div>
  {/if}
</div>
