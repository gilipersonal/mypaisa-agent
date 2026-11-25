<script lang="ts">
	// Ending a plan asks first (board Web v4 · Plans tab 3a states, a plan ended · the confirm): unlike Pause, End takes
	// the plan out of the count for good; it stays in its history and in Audit, and the admin may leave a word for the
	// audit row. Keep it is the safe answer and has the focus.
	import { AlertDialog } from 'bits-ui';
	import CalendarX from '@lucide/svelte/icons/calendar-x';

	let {
		name,
		error,
		onKeep,
		onEnd
	}: { name: string; error: string | undefined; onKeep: () => void; onEnd: (word: string) => void } = $props();

	let word = $state('');
	const uid = $props.id();
</script>

<AlertDialog.Root
	open={true}
	onOpenChange={(o: boolean) => {
		if (!o) onKeep();
	}}
>
	<AlertDialog.Overlay class="plv-scrim" />
	<AlertDialog.Content class="plv-dlg cdlg">
		<form
			class="cdb"
			onsubmit={(e: SubmitEvent) => {
				e.preventDefault();
				onEnd(word.trim());
			}}
		>
			<AlertDialog.Title class="mp-t3">End {name}?</AlertDialog.Title>
			<AlertDialog.Description class="pp mp-sub">
				It stops counting from now, and the Projection runs again without it. It stays in its history and in Audit; a
				new plan starts in the chat.
			</AlertDialog.Description>
			<label class="mp-foot mp-ink2" for="{uid}-w">A word for the audit (optional)</label>
			<input id="{uid}-w" class="afield" type="text" autocomplete="off" bind:value={word} />
			{#if error}<span class="mp-foot c-alert" role="alert">Not ended: {error}</span>{/if}
			<div class="cacts">
				<AlertDialog.Cancel class="mp-btn mp-btn-tinted mp-btn-small">Keep it</AlertDialog.Cancel>
				<button type="submit" class="mp-btn mp-btn-tinted mp-btn-small dbtn">
					<CalendarX class="lc lc-s" aria-hidden="true" />End it
				</button>
			</div>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
