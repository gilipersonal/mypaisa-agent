<script lang="ts">
	// The mark, 1c Watcher (MA-103), as the browser boards draw it: decorative wherever it sits beside its name.
	// `live` (MA-360; MA-355 d 1a, board DS v1 · Mark in motion) is the sidebar's mark: it arrives once as the app opens,
	// runs one lap when MyPaisa starts on a message and rings once when a change is saved, and is still otherwise. Only
	// the sidebar's mark is live; the marks beside the chat's messages stay still, so one mark moves at a time.
	import { untrack } from 'svelte';
	import { MarkPlayer, arriveOnce, browserEnv, liveContext, onRing } from '#lib/brand/activity.svelte.ts';
	import { watchActivity } from '#lib/brand/watch.ts';

	let { size = 32, live = false, class: className = '' }: { size?: number; live?: boolean; class?: string } = $props();

	const uid = $props.id();
	const bite = `${uid}-bite`;
	const shell = liveContext();
	const player = new MarkPlayer(browserEnv());

	$effect(() => {
		// Outside the shell there is no chat to watch: the mark stays still and nothing throws.
		if (!live || !shell) return;
		const { chat, queries } = shell;
		// Only `live` starts and stops the watch: what the player writes as it plays never runs this again.
		return untrack(() => {
			if (arriveOnce()) player.ask('open');
			const stops = [
				watchActivity(queries, () => chat.timeline, {
					lap: () => player.ask('lap'),
					saved: () => player.ask('saved')
				}),
				onRing(() => player.ask('saved'))
			];
			return () => {
				for (const stop of stops) stop();
				player.stop();
			};
		});
	});
</script>

{#if live}
	<!-- The moving cut: the coin and its bite drawn apart, so the bite (a mask) travels with the dot. At rest it draws
	     the still mark exactly. Each moment is drawn afresh, so its animations start from their first frame. -->
	{#key player.run}
		<svg
			class="mpm mpm-live {className}"
			class:mpm-go={player.scene !== undefined}
			class:mpm-rm={player.still}
			class:mpm-open={player.scene === 'open'}
			class:mpm-lap={player.scene === 'lap'}
			class:mpm-saved={player.scene === 'saved'}
			data-mark={player.scene ?? 'still'}
			width={size}
			height={size}
			viewBox="0 0 48 48"
			overflow="visible"
			aria-hidden="true"
		>
			<defs>
				<mask id={bite} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
					<rect width="48" height="48" fill="white"></rect>
					<g class="mk-k mk-orbit">
						<g class="mk-k mk-lift">
							<g class="mk-k mk-in"><circle cx="37.07" cy="10.93" r="6.8" fill="black"></circle></g>
						</g>
					</g>
				</mask>
			</defs>
			<g mask="url(#{bite})">
				<g class="mk-k mk-coin"><circle class="mpm-coin" cx="24" cy="24" r="19.5"></circle></g>
			</g>
			<g class="mpm-pound mk-k mk-ink" stroke-width="3.84">
				<path
					class="mk-k mk-stem"
					style="--logo-len:30.23;--logo-dash:27.23"
					d="M27.96 20.65 C27.65 18.1 25.98 16.55 23.74 16.55 C21.2 16.55 19.53 18.35 19.53 20.89 L19.53 28.83 C19.53 30.75 18.85 31.99 17.3 33.05"
				></path>
				<path class="mk-k mk-foot" style="--logo-len:15.90;--logo-dash:12.90" d="M17.3 33.05 L29.2 33.05"></path>
				<path class="mk-k mk-bar" style="--logo-len:12.06;--logo-dash:9.06" d="M16.8 25.73 L24.86 25.73"></path>
			</g>
			<g class="mk-k mk-orbit">
				<g class="mk-k mk-lift">
					<g class="mk-k mk-in">
						<circle class="mk-k mk-ring" cx="37.07" cy="10.93" r="5.4"></circle>
						<g class="mk-k mk-pop"><circle class="mpm-dot" cx="37.07" cy="10.93" r="5.4"></circle></g>
					</g>
				</g>
			</g>
		</svg>
	{/key}
{:else}
	<svg class="mpm {className}" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
		<path class="mpm-coin" d="M40.65 16.71 A19.5 19.5 0 1 1 31.29 7.35 A6.8 6.8 0 0 0 40.65 16.71 Z"></path>
		<g class="mpm-pound" stroke-width="3.84">
			<path
				d="M27.96 20.65 C27.65 18.1 25.98 16.55 23.74 16.55 C21.2 16.55 19.53 18.35 19.53 20.89 L19.53 28.83 C19.53 30.75 18.85 31.99 17.3 33.05"
			></path>
			<path d="M17.3 33.05 L29.2 33.05"></path>
			<path d="M16.8 25.73 L24.86 25.73"></path>
		</g>
		<circle class="mpm-dot" cx="37.07" cy="10.93" r="5.4"></circle>
	</svg>
{/if}

<style>
	/* The board's scene rules (DS v1 · Mark in motion): every part plays once, and a scene says which part does what,
	   from the motion tokens. The keyframes and --mo-travel are motion.css's (MA-355). Opacity, transform and stroke
	   drawing only. */
	.mk-ring {
		fill: none;
		stroke: var(--mp-coral);
		stroke-width: 1.6;
		opacity: 0;
	}
	.mk-pop,
	.mk-ring {
		transform-box: fill-box;
		transform-origin: center;
	}
	.mk-coin,
	.mk-orbit {
		transform-box: view-box;
		transform-origin: 24px 24px;
	}
	.mk-k {
		--kn: none;
		--kd: 1ms;
		--kw: 0ms;
		--ke: linear;
		--kdir: normal;
	}
	.mpm-open .mk-coin {
		--kn: mo-logo-settle;
		--kd: 440ms;
		--kw: 0ms;
		--ke: var(--mo-smooth);
	}
	.mpm-open .mk-stem {
		--kn: mo-logo-draw;
		--kd: 480ms;
		--kw: 160ms;
		--ke: var(--mo-smooth);
	}
	.mpm-open .mk-foot {
		--kn: mo-logo-draw;
		--kd: 280ms;
		--kw: 480ms;
		--ke: var(--mo-smooth);
	}
	.mpm-open .mk-bar {
		--kn: mo-logo-draw;
		--kd: 240ms;
		--kw: 580ms;
		--ke: var(--mo-smooth);
	}
	.mpm-open :is(.mk-stem, .mk-foot, .mk-bar) {
		stroke-dasharray: var(--logo-dash) 90;
	}
	.mpm-open .mk-orbit {
		--kn: mo-logo-arrive;
		--kd: 1000ms;
		--kw: 120ms;
		--ke: var(--mo-travel);
	}
	.mpm-open .mk-lift {
		--kn: mo-logo-seat;
		--kd: 1000ms;
		--kw: 120ms;
		--ke: linear;
	}
	.mpm-open .mk-in {
		--kn: mo-fade;
		--kd: 180ms;
		--kw: 120ms;
		--ke: linear;
	}
	.mpm-lap .mk-orbit {
		--kn: mo-logo-lap;
		--kd: var(--mo-draw);
		--kw: 100ms;
		--ke: var(--mo-travel);
	}
	.mpm-lap .mk-lift {
		--kn: mo-logo-lift;
		--kd: 1200ms;
		--kw: 0ms;
		--ke: linear;
	}
	.mpm-saved .mk-pop {
		--kn: mo-logo-swell;
		--kd: var(--mo-slow);
		--kw: 0ms;
		--ke: linear;
	}
	.mpm-saved .mk-ring {
		--kn: mo-logo-ring;
		--kd: var(--mo-slow);
		--kw: 80ms;
		--ke: var(--mo-smooth);
	}
	/* Reduce Motion: nothing travels and nothing changes size; a 150 ms cross-fade each way, in place */
	.mpm-rm[class] .mk-k {
		--kn: none;
	}
	.mpm-rm.mpm-open :is(.mk-coin, .mk-ink, .mk-orbit) {
		--kn: mo-fade;
		--kd: 150ms;
		--kw: 0ms;
		--ke: linear;
	}
	.mpm-rm.mpm-lap .mk-pop {
		--kn: mo-logo-dim;
		--kd: 450ms;
		--kw: 0ms;
		--ke: linear;
	}
	.mpm-rm.mpm-saved .mk-ring {
		--kn: mo-logo-ring-still;
		--kd: 450ms;
		--kw: 0ms;
		--ke: linear;
	}
	/* The durations are pinned so motion.css's Reduce Motion rule, which lands every animation at once, cannot flatten
	   the still version the player chose for it. */
	.mpm-go .mk-k {
		animation-name: var(--kn);
		animation-duration: var(--kd) !important;
		animation-timing-function: var(--ke);
		animation-delay: var(--kw) !important;
		animation-direction: var(--kdir);
		animation-fill-mode: both;
		animation-iteration-count: 1 !important;
	}
</style>
