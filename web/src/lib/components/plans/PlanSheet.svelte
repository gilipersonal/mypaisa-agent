<script lang="ts">
	// A plan opened (board Web v4 · Plans tab 3a, School fees opened; 3a states, a plan corrected in place): a dialog at
	// the laptop, a sheet from the foot on a phone, solid, since it holds the admin's words and figures. Its words as
	// said in the chat, each figure as a pencil an admin taps to correct in place (before → after, Save), what the
	// engine says of it, Pause or Resume, End it, Ask in chat, and its history. A member sees it read-only.
	import { Dialog } from 'bits-ui';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Pause from '@lucide/svelte/icons/pause';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Play from '@lucide/svelte/icons/play';
	import X from '@lucide/svelte/icons/x';
	import EditRow from '#lib/components/projection/EditRow.svelte';
	import Icon from '#lib/components/projection/Icon.svelte';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { hideAmounts, maskAmounts } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { PlanFigure, PlanRow } from '#lib/wealth/plans.ts';
	import type { PlanField, ProjectionCorrection } from '#lib/wealth/projection.ts';

	let {
		row,
		canEdit,
		editing,
		error,
		busy,
		onClose,
		onEdit,
		onCancelEdit,
		onSave,
		onPause,
		onEnd,
		onAsk
	}: {
		row: PlanRow;
		canEdit: boolean;
		/** The figure being corrected: its part, or `legacy` for the one the Net worth view corrects. */
		editing: PlanField | 'legacy' | undefined;
		error: string | undefined;
		busy: boolean;
		onClose: () => void;
		onEdit: (part: PlanField | 'legacy') => void;
		onCancelEdit: () => void;
		onSave: (c: ProjectionCorrection) => void;
		onPause: () => void;
		onEnd: () => void;
		onAsk: () => void;
	} = $props();

	const privacy = usePrivacy();
	const sheet = $derived(row.sheet);
	const mask = (text: string) => maskAmounts(text, privacy.on);
	const keyOf = (f: PlanFigure): PlanField | 'legacy' => f.edit?.part ?? 'legacy';
	const heading = $derived(
		editing
			? 'Correcting a figure'
			: canEdit
				? sheet.saved
					? 'Correct in place'
					: 'Tap a figure to correct it'
				: 'Its figures'
	);
</script>

<Dialog.Root
	open={true}
	onOpenChange={(o: boolean) => {
		if (!o) onClose();
	}}
>
	<Dialog.Overlay class="plv-scrim" />
	<Dialog.Content class="plv-dlg" data-testid={TestIDs.plansSheet}>
		<span class="grab" aria-hidden="true"></span>
		<div class="shd">
			<span class="mp-icontile mp-neutral"><Icon name={sheet.icon} small /></span>
			<div class="rtx">
				<Dialog.Title class="mp-t3">{sheet.title}</Dialog.Title>
				<Dialog.Description class="mp-foot mp-ink2">{sheet.effect}</Dialog.Description>
			</div>
			<span class="mp-chip" class:mp-neutral={sheet.status === 'Active'} class:mp-pause={sheet.status === 'Paused'}>
				{sheet.status}
			</span>
			<Dialog.Close class="iconbtn" aria-label="Close"><X class="lc" aria-hidden="true" /></Dialog.Close>
		</div>
		<div class="shb">
			{#if sheet.saved}
				<div class="okb ok-add" role="status">
					<CircleCheck class="lc" aria-hidden="true" /><span>{sheet.saved}</span>
				</div>
			{/if}
			<div class="qbox">
				<span class="mp-over mp-ink2">Your words</span>
				<span class="fwords">“{mask(sheet.words)}”</span>
				<span class="mp-foot mp-ink2">{sheet.wordsMeta}</span>
			</div>
			<div class="flex flex-col">
				<span class="mp-over mp-ink2">{heading}</span>
				<ul class="krows">
					{#each sheet.figures as f (f.label)}
						<li>
							{#if f.edit && editing === keyOf(f)}
								<EditRow spec={f.edit} {error} {onSave} onCancel={onCancelEdit} />
							{:else}
								<div class="krow">
									<span class="mp-sub mp-ink2">{f.label}</span>
									<span>
										{#if f.edit}
											<button
												type="button"
												id="plv-fig-{keyOf(f)}"
												class="fig ed"
												aria-label="Correct {f.label}: {hideAmounts(f.value, privacy.on)}"
												onclick={() => {
													onEdit(keyOf(f));
												}}
											>
												{mask(f.value)}<Pencil class="lc" aria-hidden="true" />
											</button>
										{:else}
											<span class="fig">{mask(f.value)}</span>
										{/if}
										{#if f.source}
											<span class="src"><Icon name={f.source.icon} />{mask(f.source.label)}</span>
										{/if}
									</span>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
			<div class="eng">
				<span class="mp-over mp-ink2">From the engine</span>
				{#each sheet.engine as line (line)}<span class="mp-sub">{mask(line)}</span>{/each}
				<span class="mp-foot mp-ink2">{sheet.engineFoot}</span>
			</div>
			<div class="acts">
				{#if canEdit}
					<button type="button" class="mp-btn mp-btn-tinted mp-btn-small" aria-disabled={busy} onclick={onPause}>
						{#if row.paused}<Play class="lc lc-s" aria-hidden="true" />Resume{:else}<Pause
								class="lc lc-s"
								aria-hidden="true"
							/>Pause{/if}
					</button>
					<button type="button" class="mp-btn mp-btn-tinted mp-btn-small" onclick={onEnd}>
						<CalendarX class="lc lc-s" aria-hidden="true" />End it
					</button>
				{/if}
				<button type="button" class="mp-btn mp-btn-tinted mp-btn-small" onclick={onAsk}>
					<MessageCircle class="lc lc-s" aria-hidden="true" />Ask in chat
				</button>
			</div>
			<div class="flex flex-col gap-1">
				<span class="mp-over mp-ink2">History</span>
				{#each sheet.history as h (h)}
					<div class="hist"><ClipboardCheck class="lc" aria-hidden="true" /><span>{mask(h)}</span></div>
				{/each}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
