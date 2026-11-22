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
		class="h-12 w-full appearance-none rounded-xl border border-input bg-transparent pr-10 pl-3.5 text-base font-medium text-ink tabular-nums outline-none focus-visible:border-ball-ink focus-visible:ring-3 focus-visible:ring-ball-ink/15"
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
		class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft"
	/>
</div>
