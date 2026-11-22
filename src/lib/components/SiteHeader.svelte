<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';

	let {
		title,
		href = '/',
		secret,
		children
	}: {
		title: string;
		href?: string;
		/** Where three quick taps on the logo go (a hidden way in, e.g. the post office). */
		secret?: string;
		children?: Snippet;
	} = $props();

	let taps = 0;
	let lastTap = 0;

	function tap(e: MouseEvent) {
		if (!secret) return;
		const now = Date.now();
		taps = now - lastTap < 600 ? taps + 1 : 1;
		lastTap = now;
		// Already here, so there's nowhere for the link to go; just count the taps.
		if (page.url.pathname === href) e.preventDefault();
		if (taps >= 3) {
			e.preventDefault();
			taps = 0;
			goto(secret);
		}
	}
</script>

<!--
	A floating frosted pill that stays at the top while scrolling. The frosted strip behind it
	hides whatever scrolls up underneath, down to where other sticky things stop (--nav-offset).
-->
<header class="sticky top-0 z-40 h-(--nav-offset) bg-page/95 px-4 pt-3 backdrop-blur-xl">
	<nav
		class="glass mx-auto flex h-14 w-full max-w-3xl items-center gap-1 rounded-full pr-2 pl-2 sm:gap-3 sm:pl-2.5"
		aria-label="Site"
	>
		<a {href} onclick={tap} class="flex min-w-0 flex-1 items-center gap-2.5 rounded-full">
			<img src={favicon} alt="" class="size-9 shrink-0 rounded-full" />
			<span
				class="truncate text-[0.9375rem] font-semibold tracking-[-0.02em] max-[22.5rem]:sr-only"
			>
				{title}
			</span>
		</a>
		{@render children?.()}
	</nav>
</header>
