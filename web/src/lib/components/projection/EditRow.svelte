<script lang="ts">
	// A correction in place (boards P5 and P6; ARCHITECTURE §4.10): the figure's row opens into a field, the new value
	// is typed, before → after shows once it is one the figure can take, and Save sends it. Return saves, Escape or
	// Cancel leaves the figure as it was. Only an existing figure is corrected here: nothing is created or deleted.
	import { onMount } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { maskAmounts } from '#lib/privacy/mask.ts';
	import { after, changes, parseTyped, problem } from '#lib/wealth/correct.ts';
	import type { EditSpec, EditValue, ProjectionCorrection } from '#lib/wealth/projection.ts';

	let {
		spec,
		error,
		onSave,
		onCancel
	}: {
		spec: EditSpec;
		/** Why the last Save was refused, if it was. */
		error: string | undefined;
		onSave: (correction: ProjectionCorrection) => void;
		onCancel: () => void;
	} = $props();

	const privacy = usePrivacy();
	const uid = $props.id();
	let typed = $state('');
	let field: HTMLInputElement | undefined = $state();
	const value = $derived(parseTyped(spec, typed));
	const ready = $derived(changes(spec, typed));
	const wrong = $derived(problem(spec, typed));

	onMount(() => field?.focus());

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (ready && value !== undefined)
			onSave({ target: spec.target, id: spec.id, value, ...(spec.part ? { part: spec.part } : {}) });
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		onCancel();
	}
</script>

{#snippet shown(v: EditValue)}
	{#if 'fig' in v}<Amount fig={v.fig} />{:else}{v.text}{/if}
{/snippet}

<form class="edrow" onsubmit={save} novalidate>
	<span id="{uid}-t" class="mp-sub mp-w6">{maskAmounts(spec.title, privacy.on)}</span>
	<span id="{uid}-f" class="mp-foot mp-ink2">{spec.field}</span>
	<label class="edin">
		{#if spec.lead}<span class="mp-ink2">{spec.lead}</span>{/if}
		<input
			bind:this={field}
			bind:value={typed}
			type="text"
			inputmode={spec.kind === 'month' ? 'text' : 'decimal'}
			autocomplete="off"
			spellcheck="false"
			aria-labelledby="{uid}-t {uid}-f"
			aria-describedby={wrong ? `${uid}-w` : spec.hint ? `${uid}-h` : undefined}
			aria-invalid={wrong ? 'true' : undefined}
			{onkeydown}
		/>
		{#if spec.unit}<span class="mp-ink2">{spec.unit}</span>{/if}
	</label>
	<div class="ba" aria-live="polite">
		{#if ready && value !== undefined}
			<span class="sr-only">From</span>
			<span class="old">{@render shown(spec.before)}</span>
			<ArrowRight class="lc lc-s mp-ink2" aria-hidden="true" />
			<span class="sr-only">to</span>
			<b>{@render shown(after(spec, value))}</b>
		{/if}
	</div>
	{#if wrong}<span id="{uid}-w" class="mp-foot c-alert" role="alert">{wrong}</span>{/if}
	{#if spec.hint}<span id="{uid}-h" class="mp-foot mp-ink2">{spec.hint}</span>{/if}
	{#if error}<span class="mp-foot c-alert" role="alert">Not saved: {error}</span>{/if}
	<div class="flex gap-2">
		<button type="submit" class="mp-btn mp-btn-primary mp-btn-small" aria-disabled={!ready}>Save</button>
		<button type="button" class="mp-btn mp-btn-tinted mp-btn-small cancel" onclick={onCancel}>Cancel</button>
	</div>
</form>
