<script lang="ts" generics="T extends string">
	let {
		label,
		value = $bindable(),
		options
	}: { label: string; value: T; options: { value: T; label: string }[] } = $props();
</script>

<div class="flex flex-col gap-2">
	<span class="text-base font-bold">{label}</span>
	<div
		class="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-ice-200/70 p-1"
		role="radiogroup"
		aria-label={label}
	>
		{#each options as o (o.value)}
			<button
				type="button"
				role="radio"
				aria-checked={value === o.value}
				class={[
					'h-11 rounded-lg px-3 font-bold transition-all',
					value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
				]}
				onclick={() => (value = o.value)}
			>
				{o.label}
			</button>
		{/each}
	</div>
</div>
