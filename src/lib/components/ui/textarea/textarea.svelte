<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '#lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'flex field-sizing-content min-h-24 w-full rounded-xl border border-input bg-white/85 px-4 py-3 text-lg text-ink shadow-[inset_0_1px_2px_oklch(0.4_0.05_245/0.08)] outline-none placeholder:text-ink-soft/60 focus-visible:border-glacier focus-visible:ring-4 focus-visible:ring-glacier/20 disabled:opacity-50',
		className
	)}
	bind:value
	{...restProps}></textarea>
