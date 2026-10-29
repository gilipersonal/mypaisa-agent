<script lang="ts">
  /* A figure corrected in place (Rule 4): before → after, Save writes one `correction` audit row. */
  import { dispatch } from '../state/store.svelte';
  let { pt }: { pt: any } = $props();
  let v = $state('');
  $effect(() => { v = pt.init ?? ''; });
  const pv = $derived(v && pt.preview ? pt.preview(v) : null);
  function save() { if (v.trim()) dispatch(pt.save(v.trim())); }
</script>
<div class="pedit">
  <span class="mp-foot mp-ink2">{pt.lbl}</span>
  <label class="efield2">
    {#if pt.prefix}<span class="efv">{pt.prefix}</span>{/if}
    <input class="efin efv" type="text" inputmode="decimal" autocomplete="off" aria-label={pt.lbl} placeholder={pt.ph ?? ''} bind:value={v}
      onkeydown={(e) => { if (e.key === 'Enter') save(); }} data-edit />
    {#if pt.suffix}<span class="efv mp-ink2">{pt.suffix}</span>{/if}
  </label>
  {#if pv}
    <div class="pba"><span class="mp-ink2">Before</span><s class="mny">{pv.before}</s><span class="ms">arrow_forward</span><span class="mp-ink2">After</span><b class="mny">{pv.after}</b>{#if pv.delta}<span class="mp-chip chip-s upchip">{pv.delta}</span>{/if}</div>
    {#if pv.net}<span class="mp-foot mp-ink2">{pv.net}</span>{/if}
  {/if}
  <div class="fx ac gap8">
    <button class="mp-btn mp-btn-primary mp-btn-small" class:pulse={!!v} type="button" onclick={save} data-act="save"><span class="ms">check</span>Save</button>
    <button class="mp-btn mp-btn-plain" type="button" onclick={() => dispatch(pt.cancel)}>Cancel</button>
  </div>
  {#if pt.note}<span class="mp-foot mp-ink2">{pt.note}</span>{/if}
</div>
