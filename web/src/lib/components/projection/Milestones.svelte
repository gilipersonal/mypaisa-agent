<script lang="ts">
	// The milestones (board 1a): what the records say will happen within the horizon, each with the shape it has on the
	// line above (a dot, a tick or a square), its day, and the amount it pays or the payment it frees.
	import Amount from '#lib/components/wealth/Amount.svelte';
	import { TestIDs } from '#lib/test-ids.ts';
	import type { Milestone } from '#lib/wealth/projection.ts';
	import Icon from './Icon.svelte';

	let { milestones }: { milestones: Milestone[] } = $props();
</script>

<section class="mp-card cpad" aria-labelledby="pj-milestones" data-testid={TestIDs.projectionMilestones}>
	<div class="ch">
		<h2 id="pj-milestones" class="mp-hl">Milestones</h2>
		<span class="mp-foot mp-ink2">from the records, on the line above</span>
	</div>
	<ul>
		{#each milestones as m (m.id)}
			<li class="lrow">
				<span class="mp-icontile mp-neutral"><Icon name={m.icon} small /></span>
				<div class="rtx flex flex-col">
					<span class="mp-sub mp-w6">{m.title}</span>
					<span class="lsub mp-foot mp-ink2">
						<span class="mk" aria-hidden="true"><i class="mk-{m.shape}"></i></span>
						<span class="nowrap">{m.when}</span>
						{#if m.note ?? m.noteFig}
							<span aria-hidden="true">·</span>
							<span>
								{m.note ?? ''}{#if m.noteFig}<Amount fig={m.noteFig} />{/if}
							</span>
						{/if}
					</span>
				</div>
				<span class="mp-foot mp-ink2 lrv">
					{#if m.fig}<Amount fig={m.fig} />{/if}
				</span>
			</li>
		{/each}
	</ul>
</section>
