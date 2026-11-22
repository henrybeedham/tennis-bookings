<script lang="ts">
	import type { Snippet } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';

	let {
		title,
		href = '/',
		children
	}: { title: string; href?: string; children?: Snippet } = $props();
</script>

<!-- A floating frosted pill that stays at the top while scrolling. -->
<header class="sticky top-3 z-40 px-4">
	<nav
		class="glass mx-auto flex h-14 w-full max-w-3xl items-center gap-3 rounded-full pr-2 pl-2.5"
		aria-label="Site"
	>
		<a {href} class="flex min-w-0 flex-1 items-center gap-2.5 rounded-full">
			<img src={favicon} alt="" class="size-9 shrink-0 rounded-full" />
			<span class="truncate text-[0.9375rem] font-semibold tracking-[-0.02em]">{title}</span>
		</a>
		{@render children?.()}
	</nav>
</header>
