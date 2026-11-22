<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: TabsPrimitive.TriggerProps = $props();
</script>

<TabsPrimitive.Trigger
	bind:ref
	data-slot="tabs-trigger"
	class={cn(
		"relative inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-[0.9375rem] font-medium whitespace-nowrap text-ink-soft transition-all outline-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ball-ink/30 disabled:pointer-events-none disabled:opacity-50 max-sm:h-14 max-sm:flex-col max-sm:gap-1 max-sm:rounded-[1.25rem] max-sm:px-0.5 max-sm:text-xs data-active:bg-ink data-active:text-on-ink data-active:hover:text-on-ink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		className
	)}
	{...restProps}
/>
