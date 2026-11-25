<script lang="ts">
	// The assumptions (boards 1a, P2 and P5): every rate the Projection rests on, in three groups, each with its source
	// and the reason for it. An admin taps a figure to correct it in place; a member who is not an admin sees a lock, the
	// board's note and no edit. A rate is not money, so privacy mode leaves it.
	import Lock from '@lucide/svelte/icons/lock';
	import Pencil from '@lucide/svelte/icons/pencil';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { Projection, ProjectionCorrection } from '#lib/wealth/projection.ts';
	import EditRow from './EditRow.svelte';
	import Icon from './Icon.svelte';
	import SavedLine from './SavedLine.svelte';

	let {
		assumptions,
		editing,
		error,
		onEdit,
		onSave,
		onCancel
	}: {
		assumptions: Projection['assumptions'];
		/** The assumption being corrected, by its id. */
		editing: string | undefined;
		error: string | undefined;
		onEdit: (id: string) => void;
		onSave: (correction: ProjectionCorrection) => void;
		onCancel: () => void;
	} = $props();
</script>

<div class="pstack tight">
	<section class="mp-card cpad" aria-labelledby="pj-assumptions" data-testid={TestIDs.projectionAssumptions}>
		<div class="ch">
			<h2 id="pj-assumptions" class="mp-hl">Assumptions</h2>
			<span class="mp-foot mp-ink2">each with its source</span>
		</div>
		<div class="note">
			{#if assumptions.locked}
				<Lock class="lc" aria-hidden="true" />
			{:else}
				<Pencil class="lc" aria-hidden="true" />
			{/if}
			<span class="mp-foot mp-ink2">{assumptions.note}</span>
		</div>
		{#each assumptions.groups as group (group.title)}
			<div class="grp">
				<h3 class="mp-over mp-ink2">{group.title}</h3>
				<ul>
					{#each group.rows as row (row.id)}
						<li>
							{#if row.edit && editing === row.id}
								<EditRow spec={row.edit} {error} {onSave} {onCancel} />
							{:else}
								<div class="as-row">
									<span class="as-n mp-sub mp-w6">{row.name}</span>
									{#if row.edit}
										<button
											type="button"
											id="pj-fig-assumption-{row.id}"
											class="as-f fig ed"
											aria-label="Correct {row.name}: {row.value}"
											onclick={() => {
												onEdit(row.id);
											}}
										>
											{row.value}<Pencil class="lc" aria-hidden="true" />
										</button>
									{:else}
										<span class="as-f fig">{row.value}</span>
									{/if}
									<span class="as-s">
										<span class="src"><Icon name={row.source.kind} />{row.source.label}</span>
										<span class="mp-foot mp-ink2">{row.why}</span>
									</span>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>
	{#if assumptions.saved && editing === undefined}<SavedLine saved={assumptions.saved} />{/if}
</div>
