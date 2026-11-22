<script lang="ts">
	import Megaphone from '@lucide/svelte/icons/megaphone';

	let { text }: { text: string } = $props();
</script>

<div
	role="status"
	class="flex items-start gap-3.5 rounded-2xl border border-[oklch(0.88_0.09_95)] bg-[oklch(0.97_0.06_100/0.85)] p-4 shadow-[0_12px_30px_-18px_oklch(0.55_0.12_95/0.8)] backdrop-blur sm:p-5"
>
	<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-ball">
		<Megaphone class="size-5 text-ink" />
	</span>
	<p class="self-center text-lg leading-snug font-semibold whitespace-pre-line">{text}</p>
</div>
