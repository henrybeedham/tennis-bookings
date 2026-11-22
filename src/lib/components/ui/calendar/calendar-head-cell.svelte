<script lang="ts">
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: CalendarPrimitive.HeadCellProps = $props();
</script>

<CalendarPrimitive.HeadCell
	bind:ref
	class={cn(
		'w-(--cell-size) pb-1 text-xs font-medium tracking-[0.06em] text-ink-soft uppercase',
		className
	)}
	{...restProps}
/>
