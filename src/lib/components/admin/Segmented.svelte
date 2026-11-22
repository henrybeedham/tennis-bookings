<script lang="ts" generics="T extends string">
	let {
		label,
		value = $bindable(),
		options
	}: { label: string; value: T; options: { value: T; label: string }[] } = $props();
</script>

<div class="flex flex-col gap-2">
	<span class="text-sm font-medium">{label}</span>
	<div
		class="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-raised p-1"
		role="radiogroup"
		aria-label={label}
	>
		{#each options as o (o.value)}
			<button
				type="button"
				role="radio"
				aria-checked={value === o.value}
				class={[
					'h-10 rounded-full px-3 text-[0.9375rem] font-medium transition-all',
					value === o.value ? 'bg-ink text-on-ink' : 'text-ink-soft hover:text-ink'
				]}
				onclick={() => (value = o.value)}
			>
				{o.label}
			</button>
		{/each}
	</div>
</div>
