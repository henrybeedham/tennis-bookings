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
		"relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-base font-bold whitespace-nowrap text-ink-soft transition-all outline-none hover:text-ink focus-visible:ring-4 focus-visible:ring-glacier/30 disabled:pointer-events-none disabled:opacity-50 max-sm:h-16 max-sm:flex-col max-sm:gap-1 max-sm:px-0.5 max-sm:text-[0.78rem] data-active:bg-ink data-active:text-white data-active:shadow-[0_6px_16px_-8px_oklch(0.27_0.045_250/0.8)] data-active:hover:text-white [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
		className
	)}
	{...restProps}
/>
