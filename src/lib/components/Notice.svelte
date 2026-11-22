<script lang="ts">
	import Megaphone from '@lucide/svelte/icons/megaphone';

	let { text }: { text: string } = $props();
</script>

<div role="status" class="panel flex items-center gap-4 rounded-3xl p-3 pr-5">
	<span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-ball text-on-ball">
		<Megaphone class="size-5" />
	</span>
	<p class="text-[0.9375rem] leading-relaxed font-medium whitespace-pre-line">{text}</p>
</div>
