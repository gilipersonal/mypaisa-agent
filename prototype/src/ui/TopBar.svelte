<script lang="ts">
  /* The demo's own bar, as Prototype v4's top bar draws it: door, theme, privacy, viewer, currency, width, restart,
     and the walk's steps with the guide line and Continue. */
  import { dispatch, store } from '../state/store.svelte';
  import { STEPS } from '../presenter/script';
  import { jumpTo, continueStep } from '../presenter/walk';
  const s = $derived(store.s);
  const doors = [['web', 'Desktop 1440'], ['phone', 'Phone web 390'], ['iphone', 'iPhone'], ['ipad', 'iPad']] as const;
  const step = $derived(STEPS[s.presenter.step]);
  const go = (a: any) => () => dispatch(a);
</script>
<header class="ptop">
  <div class="prow1">
    <span class="pname"><span class="pkey">MA-290</span>MyPaisa · the demo</span>
    <span class="pgrp"><span class="plbl">Door</span><span class="pseg" role="group" aria-label="Door">{#each doors as [id, t]}<span class="segw"><button class:on={s.door === id} type="button" aria-pressed={s.door === id} onclick={go({ type: 'door', door: id })} data-door={id}>{t}</button></span>{/each}</span></span>
    {#if s.door === 'ipad' || s.door === 'web'}<label class="wdemo">Width <input type="range" min="320" max={s.door === 'web' ? 1920 : 1366} step="1" value={s.w[s.door]} oninput={(e) => dispatch({ type: 'width', door: s.door, w: +(e.currentTarget as HTMLInputElement).value })} aria-label="Window width" /><b>{s.w[s.door]}</b></label>{/if}
    <span class="pgrp"><span class="plbl">Theme</span><span class="pseg" role="group" aria-label="Theme"><span class="segw"><button class:on={s.theme === 'light'} type="button" onclick={go({ type: 'theme', theme: 'light' })}>Light</button></span><span class="segw"><button class:on={s.theme === 'dark'} type="button" onclick={go({ type: 'theme', theme: 'dark' })} data-theme="dark">Dark</button></span></span></span>
    <button class="pbtn" class:on={s.priv} type="button" aria-pressed={s.priv} onclick={go({ type: 'priv' })}><span class="ms">{s.priv ? 'visibility_off' : 'visibility'}</span>Privacy</button>
    <span class="pgrp"><span class="plbl">Viewer</span><span class="pseg" role="group" aria-label="Viewer"><span class="segw"><button class:on={s.viewer === 'arun'} type="button" onclick={go({ type: 'viewer', id: 'arun' })}>Arun</button></span><span class="segw"><button class:on={s.viewer === 'asha'} type="button" onclick={go({ type: 'viewer', id: 'asha' })} data-viewer="asha">Asha</button></span></span></span>
    <span class="pgrp"><span class="plbl">Money</span><span class="pseg" role="group" aria-label="Currency"><span class="segw"><button class:on={s.ccy === 'GBP'} type="button" onclick={go({ type: 'ccy', ccy: 'GBP' })}>£</button></span><span class="segw"><button class:on={s.ccy === 'INR'} type="button" onclick={go({ type: 'ccy', ccy: 'INR' })}>₹</button></span></span></span>
    <span class="pf1"></span>
    {#if s.branch}<button class="pbtn on" type="button" onclick={go({ type: 'branch.end' })}><span class="ms">undo</span>Back to the walk</button>{/if}
    <button class="pbtn" class:on={s.presenter.on} type="button" onclick={go({ type: 'presenter', patch: { on: !s.presenter.on } })} data-act="walk"><span class="ms">slideshow</span>Walk</button>
    <button class="pbtn" type="button" onclick={go({ type: 'reset' })}><span class="ms">restart_alt</span>Restart</button>
  </div>
  {#if s.presenter.on && STEPS.length}
    <nav class="psteps" aria-label="The walk">{#each STEPS as st, i}<button class="pst" class:on={i === s.presenter.step} class:done={i < s.presenter.step} type="button" aria-current={i === s.presenter.step} onclick={() => jumpTo(i)} title={st.chapter}><b>{i + 1}</b>{st.title}</button>{/each}</nav>
    {#if step}<div class="pguide" aria-live="polite"><span class="pgt">{step.chapter} · {step.title}</span><span class="pgh">{step.guide}<br /><i>{step.talk}</i></span><button class="pbtn go" type="button" onclick={continueStep} data-act="continue">{s.presenter.step < STEPS.length - 1 ? 'Continue' : 'Done'}<span class="ms">arrow_forward</span></button></div>{/if}
  {/if}
</header>
