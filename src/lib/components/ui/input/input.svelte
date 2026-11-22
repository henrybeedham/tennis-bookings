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
			'h-13 w-full min-w-0 rounded-xl border border-input bg-white/85 px-4 text-lg text-ink shadow-[inset_0_1px_2px_oklch(0.4_0.05_245/0.08)] transition-[border-color,box-shadow] outline-none placeholder:text-ink-soft/60 focus-visible:border-glacier focus-visible:ring-4 focus-visible:ring-glacier/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15',
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
			'h-13 w-full min-w-0 rounded-xl border border-input bg-white/85 px-4 text-lg text-ink shadow-[inset_0_1px_2px_oklch(0.4_0.05_245/0.08)] transition-[border-color,box-shadow] outline-none placeholder:text-ink-soft/60 focus-visible:border-glacier focus-visible:ring-4 focus-visible:ring-glacier/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15',
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
