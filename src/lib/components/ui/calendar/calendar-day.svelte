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
		'flex size-(--cell-size) items-center justify-center rounded-(--cell-radius) p-0 text-[0.9375rem] leading-none font-medium whitespace-nowrap text-ink tabular-nums transition-colors outline-none select-none',
		'not-data-selected:hover:bg-raised',
		'[&[data-today]:not([data-selected])]:font-semibold [&[data-today]:not([data-selected])]:ring-1 [&[data-today]:not([data-selected])]:ring-ball-ink [&[data-today]:not([data-selected])]:ring-inset',
		'data-[selected]:bg-ball data-[selected]:font-semibold data-[selected]:text-on-ball',
		'[&[data-outside-month]:not([data-selected])]:text-ink-soft/45',
		'data-[disabled]:pointer-events-none data-[disabled]:text-ink-soft/35',
		'data-[unavailable]:text-ink-soft/35 data-[unavailable]:line-through',
		'focus-visible:ring-3 focus-visible:ring-ball-ink/30',
		className
	)}
	{...restProps}
/>
