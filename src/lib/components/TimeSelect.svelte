<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { formatTime } from '#lib/dates.js';

	interface Option {
		value: number;
		disabled?: boolean;
		hint?: string;
	}

	let {
		id,
		name,
		value = $bindable(),
		options
	}: { id: string; name?: string; value: number; options: Option[] } = $props();
</script>

<div class="relative">
	<select
		{id}
		{name}
		class="h-13 w-full appearance-none rounded-xl border border-input bg-white/85 pr-11 pl-4 text-lg font-semibold text-ink tabular-nums shadow-[inset_0_1px_2px_oklch(0.4_0.05_245/0.08)] outline-none focus-visible:border-glacier focus-visible:ring-4 focus-visible:ring-glacier/20"
		value={formatTime(value)}
		onchange={(e) => {
			const [h, m] = e.currentTarget.value.split(':').map(Number);
			value = h * 60 + m;
		}}
	>
		{#each options as o (o.value)}
			<option value={formatTime(o.value)} disabled={o.disabled}>
				{formatTime(o.value)}{o.hint ? `  (${o.hint})` : ''}
			</option>
		{/each}
	</select>
	<ChevronDown
		class="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-ink-soft"
	/>
</div>
