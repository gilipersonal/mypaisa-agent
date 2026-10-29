<script lang="ts">
  import { dispatch, store } from '../state/store.svelte';
  import { placeholder, suggestions } from './composer';
  let { ios = false }: { ios?: boolean } = $props();
  const s = $derived(store.s);
  const sug = $derived(suggestions(s));
  let text = $state('');
  function send() { const t = text; text = ''; dispatch({ type: 'say', t }); }
</script>
{#if ios}
  <div class="composer">
    <div class="chips">{#each sug as c}<button class="gchip lg" class:sug={c.sug} type="button" onclick={() => dispatch(c.act)}><span class="ms">{c.icon}</span><span>{c.t}</span></button>{/each}</div>
    <div class="cbar">
      <button class="cplus lg" type="button" aria-label="Attach a file" onclick={() => dispatch({ type: 'nope', t: 'Attaching a file: try the statement chip on Sun 1 Nov.' })}><span class="ms">add</span></button>
      <div class="cfield lg">
        <input class="cin" type="text" autocomplete="off" aria-label="Message" placeholder={placeholder(s)} bind:value={text} onkeydown={(e) => { if (e.key === 'Enter') send(); }} />
        <button class="csend" class:on={!!text} type="button" aria-label="Send" onclick={send}><span class="ms">{text ? 'arrow_upward' : 'mic'}</span></button>
      </div>
    </div>
  </div>
{:else}
  <div class="wsugg">{#each sug as c}<button class="sg" class:sug={c.sug} type="button" onclick={() => dispatch(c.act)}><span class="ms">{c.sug ? 'north_east' : c.icon}</span>{c.t}</button>{/each}</div>
  <div class="wcomp">
    <button class="wplus" type="button" aria-label="Attach a file" onclick={() => dispatch({ type: 'nope', t: 'Attaching a file: try the statement chip on Sun 1 Nov.' })}><span class="ms">add</span></button>
    <div class="wfield">
      <input class="win" type="text" autocomplete="off" aria-label="Message" placeholder={placeholder(s)} bind:value={text} onkeydown={(e) => { if (e.key === 'Enter') send(); }} />
      <button class="wsend" class:on={!!text} type="button" aria-label="Send" onclick={send}><span class="ms">arrow_upward</span></button>
    </div>
  </div>
{/if}
