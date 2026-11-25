<script lang="ts">
	// One message, as the chat boards draw it: the member's on the right (with a file, and Waiting or Sent while it was
	// offline), the agent's on the left with the mark: its words (a caret while they stream), Reading it… while a file is
	// read, the one question's chips, and its cards. A card this door does not know shows its plain line.
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import Clock from '@lucide/svelte/icons/clock';
	import FileText from '@lucide/svelte/icons/file-text';
	import { isConfirmCard, isFigureCard } from '#lib/cards/kinds.ts';
	import { isPlanCard } from '#lib/cards/plan.ts';
	import { canRender } from '#lib/cards/types.ts';
	import type { ChatMessage } from '#lib/chat/timeline.ts';
	import type { CardAction } from '#lib/chat/transport.ts';
	import Mark from '#lib/components/brand/Mark.svelte';
	import { usePrivacy } from '#lib/components/shell/privacy.svelte.ts';
	import { maskAmounts } from '#lib/privacy/mask.ts';
	import ConfirmCard from './ConfirmCard.svelte';
	import FigureCard from './FigureCard.svelte';
	import PlanCard from './PlanCard.svelte';

	let {
		message,
		onChoose,
		onTap
	}: {
		message: ChatMessage;
		onChoose: (chipId: string) => void;
		onTap: (cardId: string, action: CardAction) => void;
	} = $props();
	// Privacy mode hides the amounts in the conversation too (board Browser · Dashboard, privacy on).
	const privacy = usePrivacy();
	const text = $derived(maskAmounts(message.text, privacy.on));
</script>

{#if message.role === 'member'}
	{#if message.file}
		<div class="me mf">
			<div class="file">
				<span class="ftile"><FileText class="lc" aria-hidden="true" /></span>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="fname">{message.file.name}</span>
					<span class="fmeta">{message.file.meta}</span>
				</span>
			</div>
			{#if message.text}<span class="mft">{text}</span>{/if}
		</div>
	{:else}
		<div class="me">{text}</div>
	{/if}
	{#if message.delivery === 'waiting'}
		<div class="mest"><Clock class="lc" aria-hidden="true" />Waiting · sends when you're back online</div>
	{:else if message.sentLate}
		<div class="mest"><CheckCheck class="lc" aria-hidden="true" />{message.sentLate}</div>
	{/if}
{:else}
	<div class="ai">
		<Mark class="aim" size={26} />
		<div class="aib">
			{#if message.phase === 'reading'}
				<div class="reading">
					<span class="typing" aria-hidden="true"><i></i><i></i><i></i></span><span>{text}</span>
				</div>
			{:else if message.text}
				<div class="ait">
					{text}{#if message.phase === 'streaming'}<span class="caret" aria-hidden="true"></span>{/if}
				</div>
			{/if}
			{#if message.chips}
				<div class="chips" role="group" aria-label="Answers">
					{#each message.chips as chip (chip.id)}
						{@const chosen = message.chosen === chip.id}
						<button
							type="button"
							class="chipb"
							class:sel={chosen}
							aria-pressed={chosen}
							aria-disabled={message.chosen !== undefined}
							onclick={() => {
								if (message.chosen === undefined) onChoose(chip.id);
							}}
						>
							{chip.label}
						</button>
					{/each}
				</div>
			{/if}
			{#each message.cards ?? [] as card (card.id)}
				{#if canRender(card) && isConfirmCard(card)}
					<ConfirmCard
						{card}
						privacy={privacy.on}
						onTap={(action: CardAction) => {
							onTap(card.id, action);
						}}
					/>
				{:else if canRender(card) && isFigureCard(card)}
					<FigureCard {card} privacy={privacy.on} />
				{:else if canRender(card) && isPlanCard(card)}
					<PlanCard
						{card}
						privacy={privacy.on}
						{onChoose}
						onTap={(action: CardAction) => {
							onTap(card.id, action);
						}}
					/>
				{:else}
					<div class="ait">{maskAmounts(card.fallback, privacy.on)}</div>
				{/if}
			{/each}
			{#if message.phase === 'streaming'}
				<span class="aimeta">Writing · the figures follow from the engine</span>
			{:else if message.meta}
				<span class="aimeta">{message.meta}</span>
			{/if}
		</div>
	</div>
{/if}
