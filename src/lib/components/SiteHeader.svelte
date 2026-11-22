<script lang="ts">
	import type { Snippet } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';

	let { title, subtitle, children }: { title: string; subtitle?: string; children?: Snippet } =
		$props();
</script>

<header class="flex flex-wrap items-center gap-4">
	<a href="/" class="flex min-w-[16rem] flex-1 items-center gap-3.5 rounded-2xl">
		<img
			src={favicon}
			alt=""
			class="size-14 shrink-0 rounded-2xl shadow-[0_10px_24px_-12px_oklch(0.4_0.1_200/0.7)]"
		/>
		<span class="min-w-0">
			<span class="block text-2xl leading-tight font-bold tracking-[-0.02em] sm:text-[2rem]">
				{title}
			</span>
			{#if subtitle}<span class="block text-lg leading-snug text-ink-soft">{subtitle}</span>{/if}
		</span>
	</a>
	{@render children?.()}
</header>
