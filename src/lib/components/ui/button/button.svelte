<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export const buttonVariants = tv({
		base: "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-transparent font-semibold transition-[background-color,box-shadow,transform,color] duration-150 outline-none select-none active:not-aria-[haspopup]:translate-y-px focus-visible:ring-4 focus-visible:ring-glacier/35 disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
		variants: {
			variant: {
				default:
					'bg-ink text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_6px_16px_-6px_oklch(0.27_0.045_250/0.6)] hover:bg-[oklch(0.33_0.055_250)]',
				outline:
					'border-white bg-white/70 text-ink shadow-[0_1px_2px_oklch(0.4_0.05_245/0.08),inset_0_0_0_1px_oklch(0.86_0.025_235)] backdrop-blur hover:bg-white aria-expanded:bg-white',
				secondary: 'bg-ice-200/80 text-ink hover:bg-ice-300/70',
				ghost: 'text-ink hover:bg-white/70 aria-expanded:bg-white/70',
				destructive:
					'bg-destructive text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.2),0_6px_16px_-6px_oklch(0.52_0.17_27/0.6)] hover:bg-[oklch(0.47_0.17_27)] focus-visible:ring-destructive/30',
				link: 'text-glacier underline underline-offset-4 hover:text-ink'
			},
			size: {
				default: 'h-12 px-5 text-base',
				sm: "h-10 rounded-lg px-3.5 text-[0.95rem] [&_svg:not([class*='size-'])]:size-4",
				lg: 'h-14 px-7 text-lg',
				xl: "h-16 rounded-2xl px-8 text-xl [&_svg:not([class*='size-'])]:size-6",
				icon: 'size-12',
				'icon-sm': 'size-10 rounded-lg',
				'icon-lg': 'size-14'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
