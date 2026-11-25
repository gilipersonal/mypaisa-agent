<script lang="ts">
	// The plan items (boards 1a, P2 and P6): the admin's future one-offs and recurring flows, each a square on the line.
	// An admin corrects one in place and adds one only in the chat; a member who is not an admin sees them plain, with
	// the board's note and no edit.
	import Lock from '@lucide/svelte/icons/lock';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { maskedMoney } from '#lib/privacy/mask.ts';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { Projection, ProjectionCorrection } from '#lib/wealth/projection.ts';
	import EditRow from './EditRow.svelte';
	import Icon from './Icon.svelte';
	import SavedLine from './SavedLine.svelte';

	let {
		plan,
		editing,
		error,
		onEdit,
		onSave,
		onCancel,
		onAdd
	}: {
		plan: Projection['plan'];
		/** The plan item being corrected, by its id. */
		editing: string | undefined;
		error: string | undefined;
		onEdit: (id: string) => void;
		onSave: (correction: ProjectionCorrection) => void;
		onCancel: () => void;
		onAdd: () => void;
	} = $props();

	const privacy = usePrivacy();
</script>

<div class="pstack tight">
	<section class="mp-card cpad" aria-labelledby="pj-plan" data-testid={TestIDs.projectionPlan}>
		<div class="ch">
			<h2 id="pj-plan" class="mp-hl">Plan items</h2>
			<span class="mp-foot mp-ink2">{plan.aside}</span>
		</div>
		<ul>
			{#each plan.items as p (p.id)}
				<li>
					{#if p.edit && editing === p.id}
						<EditRow spec={p.edit} {error} {onSave} {onCancel} />
					{:else}
						<div class="lrow">
							<span class="mp-icontile mp-neutral"><Icon name={p.icon} small /></span>
							<div class="rtx flex flex-col">
								<span class="mp-sub mp-w6">{p.title}</span>
								<span class="lsub mp-foot mp-ink2">
									<span class="mk" aria-hidden="true"><i class="mk-square"></i></span><span>{p.when}</span>
								</span>
								{#if p.corrected}
									<span class="as-s done">
										<span class="src"><Icon name="member" />{p.corrected.by}</span>
										<span class="mp-foot mp-ink2">
											{p.corrected.was}
											{#if p.corrected.wasFig}<Amount fig={p.corrected.wasFig} />{/if}
										</span>
									</span>
								{/if}
							</div>
							{#if p.edit}
								<button
									type="button"
									id="pj-fig-plan-{p.id}"
									class="fig ed"
									aria-label="Correct {p.title}: {p.fig.pre ?? ''}{maskedMoney(
										p.fig.amount,
										p.fig.currency,
										privacy.on,
										{
											whole: true
										}
									)}"
									onclick={() => {
										onEdit(p.id);
									}}
								>
									<Amount fig={p.fig} /><Pencil class="lc" aria-hidden="true" />
								</button>
							{:else}
								<span class="fig"><Amount fig={p.fig} /></span>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if plan.canAdd}
			<button type="button" class="mp-btn mp-btn-tinted mp-btn-small addp" onclick={onAdd}>
				<MessageCircle class="lc lc-s" aria-hidden="true" />Add a plan item in the chat
			</button>
		{/if}
		{#if plan.note}
			<div class="note below">
				<Lock class="lc" aria-hidden="true" /><span class="mp-foot mp-ink2">{plan.note}</span>
			</div>
		{/if}
	</section>
	{#if plan.saved && editing === undefined}<SavedLine saved={plan.saved} />{/if}
</div>
