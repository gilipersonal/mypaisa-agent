<script lang="ts">
	// The mark, 1c Watcher (MA-103), as the browser boards draw it: decorative wherever it sits beside its name.
	let { size = 32, class: className = '' }: { size?: number; class?: string } = $props();
</script>

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
