<script lang="ts">
	// The composer (boards 1a, 2a, 2c, 2d): + to attach a file, the field, and Send, which becomes Stop while a reply
	// streams. A file waits as a chip with its name and size, removable with ×, until Send. Enter sends; Shift+Enter is a
	// new line. Offline, what is typed still sends: it waits in this browser until the connection is back.
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import FileText from '@lucide/svelte/icons/file-text';
	import Plus from '@lucide/svelte/icons/plus';
	import Square from '@lucide/svelte/icons/square';
	import X from '@lucide/svelte/icons/x';
	import { describeFile } from '#lib/chat/files.ts';
	import type { FileRef } from '#lib/chat/timeline.ts';

	let {
		placeholder,
		streaming,
		attachment = $bindable(),
		text = $bindable(''),
		onSend,
		onStop,
		field = $bindable(),
		picker = $bindable()
	}: {
		placeholder: string;
		streaming: boolean;
		attachment: FileRef | undefined;
		text?: string;
		onSend: (text: string) => void;
		onStop: () => void;
		field?: HTMLTextAreaElement | undefined;
		picker?: HTMLInputElement | undefined;
	} = $props();

	const ready = $derived(text.trim().length > 0 || attachment !== undefined);

	function send() {
		if (!ready) return;
		onSend(text);
		text = '';
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			send();
		}
	}

	function onpick(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) attachment = describeFile(file);
		input.value = '';
		field?.focus();
	}
</script>

<div class="comp">
	<button type="button" class="cplus" aria-label="Attach a file" onclick={() => picker?.click()}>
		<Plus class="lc" aria-hidden="true" />
	</button>
	<input
		bind:this={picker}
		class="sr-file"
		type="file"
		accept="application/pdf,image/*"
		tabindex="-1"
		aria-hidden="true"
		onchange={onpick}
	/>
	{#if attachment}
		<div class="cfield att">
			<div class="file">
				<span class="ftile"><FileText class="lc" aria-hidden="true" /></span>
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="fname">{attachment.name}</span>
					<span class="fmeta">{attachment.meta}</span>
				</span>
				<button type="button" class="xbtn" aria-label="Remove the file" onclick={() => (attachment = undefined)}>
					<X class="lc" aria-hidden="true" />
				</button>
			</div>
			<div class="attline">
				<textarea
					bind:this={field}
					bind:value={text}
					class="ph"
					rows="1"
					style="field-sizing: content"
					aria-label="Message MyPaisa"
					placeholder="Say what it is (optional)"
					{onkeydown}></textarea>
				<button type="button" class="send on" aria-label="Send" onclick={send}>
					<ArrowUp class="lc" aria-hidden="true" />
				</button>
			</div>
		</div>
	{:else}
		<div class="cfield">
			<textarea
				bind:this={field}
				bind:value={text}
				class="ph"
				rows="1"
				style="field-sizing: content"
				aria-label="Message MyPaisa"
				{placeholder}
				{onkeydown}></textarea>
			{#if streaming && !ready}
				<button type="button" class="send on" aria-label="Stop" onclick={onStop}>
					<Square class="lc" aria-hidden="true" />
				</button>
			{:else}
				<button type="button" class="send" class:on={ready} aria-label="Send" onclick={send}>
					<ArrowUp class="lc" aria-hidden="true" />
				</button>
			{/if}
		</div>
	{/if}
</div>
