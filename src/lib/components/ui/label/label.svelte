<script lang="ts">
	import { Label as LabelPrimitive } from 'bits-ui';
	import { cn } from '#lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: LabelPrimitive.RootProps = $props();
</script>

<LabelPrimitive.Root
	bind:ref
	data-slot="label"
	class={cn(
		'flex items-center gap-2 text-base font-bold text-ink select-none peer-disabled:opacity-50',
		className
	)}
	{...restProps}
/>
