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
	style="--normal-bg: oklch(0.995 0.003 225 / 0.95); --normal-text: var(--ink); --normal-border: white; --border-radius: var(--radius-xl); --width: 24rem;"
	toastOptions={{
		classes: {
			toast:
				'!gap-3 !text-lg !font-semibold !p-5 !shadow-[0_20px_50px_-20px_oklch(0.3_0.08_245/0.5)] backdrop-blur-xl'
		}
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-6 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-6 text-ball-deep" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-6" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-6" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-6" />
	{/snippet}
</Sonner>
