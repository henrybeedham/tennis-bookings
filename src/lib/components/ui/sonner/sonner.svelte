<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme="light"
	position="top-center"
	richColors={false}
	class="toaster group"
	style="--normal-bg: var(--surface); --normal-text: var(--ink); --normal-border: var(--line); --border-radius: var(--radius-xl); --width: 24rem;"
	toastOptions={{
		classes: {
			toast:
				'!gap-3 !text-[0.9375rem] !font-medium !px-4 !py-3.5 !shadow-[0_0_0_1px_oklch(0.3_0.03_250/0.06),0_12px_32px_-12px_oklch(0.25_0.05_250/0.35)] backdrop-blur-xl'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-5 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-5 text-ball-ink" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-5 text-destructive" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-5" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-5" />
	{/snippet}
</Sonner>
