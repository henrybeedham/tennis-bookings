<script lang="ts">
	import type { Snippet } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';

	let {
		title,
		href = '/',
		children
	}: { title: string; href?: string; children?: Snippet } = $props();
</script>

<!--
	A floating frosted pill that stays at the top while scrolling. The frosted strip behind it
	hides whatever scrolls up underneath, down to where other sticky things stop (--nav-offset).
-->
<header class="sticky top-0 z-40 h-(--nav-offset) bg-page/95 px-4 pt-3 backdrop-blur-xl">
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
