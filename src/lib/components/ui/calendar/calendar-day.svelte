<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.DayProps = $props();
</script>

<CalendarPrimitive.Day
	bind:ref
	class={cn(
		'flex size-(--cell-size) items-center justify-center rounded-(--cell-radius) p-0 text-lg leading-none font-bold whitespace-nowrap text-ink tabular-nums transition-colors outline-none select-none',
		'not-data-selected:hover:bg-ice-200',
		'[&[data-today]:not([data-selected])]:bg-ball/45 [&[data-today]:not([data-selected])]:ring-2 [&[data-today]:not([data-selected])]:ring-ball [&[data-today]:not([data-selected])]:ring-inset',
		'data-[selected]:bg-ink data-[selected]:text-white data-[selected]:shadow-[0_6px_16px_-8px_oklch(0.27_0.045_250/0.8)]',
		'[&[data-outside-month]:not([data-selected])]:text-ink-soft/45',
		'data-[disabled]:pointer-events-none data-[disabled]:font-semibold data-[disabled]:text-ink-soft/35',
		'data-[unavailable]:text-ink-soft/35 data-[unavailable]:line-through',
		'focus-visible:ring-4 focus-visible:ring-glacier/35',
		className
	)}
	{...restProps}
/>
