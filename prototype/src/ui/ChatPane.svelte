<script lang="ts">
  import { store } from '../state/store.svelte';
  import { deepMask } from './mask';
  import Chat from './Chat.svelte';
  let { web }: { web: boolean } = $props();
  const s = $derived(store.s);
  const list = $derived(deepMask([...s.chat.history, ...s.chat.live], s.priv));
  let el: HTMLDivElement | undefined = $state();
  $effect(() => { list.length; s.seq; queueMicrotask(() => { if (el) el.scrollTop = el.scrollHeight; }); });
</script>
<div class="pscroll" data-scroll="chat" bind:this={el}><div class={web ? '' : 'chatpad'}><Chat {list} {web} /></div></div>
