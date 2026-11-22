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
		'flex field-sizing-content min-h-24 w-full rounded-xl border border-input bg-transparent px-3.5 py-3 text-base text-ink outline-none placeholder:text-ink-soft/55 focus-visible:border-ball-ink focus-visible:ring-3 focus-visible:ring-ball-ink/15 disabled:opacity-50',
		className
	)}
	bind:value
	{...restProps}></textarea>
