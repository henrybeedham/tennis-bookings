<script lang="ts">
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList | null } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'h-12 w-full min-w-0 rounded-xl border border-input bg-transparent px-3.5 text-base text-ink transition-[border-color,box-shadow] outline-none placeholder:text-ink-soft/55 focus-visible:border-ball-ink focus-visible:ring-3 focus-visible:ring-ball-ink/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15',
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'h-12 w-full min-w-0 rounded-xl border border-input bg-transparent px-3.5 text-base text-ink transition-[border-color,box-shadow] outline-none placeholder:text-ink-soft/55 focus-visible:border-ball-ink focus-visible:ring-3 focus-visible:ring-ball-ink/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15',
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
