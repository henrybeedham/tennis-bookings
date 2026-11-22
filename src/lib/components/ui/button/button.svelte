<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';
	import { cn, type WithElementRef } from '#lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	export const buttonVariants = tv({
		base: "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent font-medium tracking-[-0.01em] transition-[background-color,border-color,color,filter] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ball-ink/40 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[1.125rem]",
		variants: {
			variant: {
				default: 'bg-ink font-semibold text-on-ink hover:bg-ink/85',
				ball: 'bg-ball font-semibold text-on-ball hover:brightness-95',
				outline:
					'border-(--glass-line) bg-transparent text-ink hover:bg-raised aria-expanded:bg-raised',
				secondary: 'bg-raised text-ink hover:bg-line',
				ghost: 'text-ink-soft hover:bg-raised hover:text-ink aria-expanded:bg-raised',
				destructive:
					'bg-destructive font-semibold text-white hover:bg-destructive/90 focus-visible:ring-destructive/30',
				link: 'rounded-sm text-ink underline decoration-line underline-offset-4 hover:decoration-ink'
			},
			size: {
				default: 'h-11 px-5 text-[0.9375rem]',
				sm: "h-9 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
				lg: 'h-12 px-6 text-base',
				xl: 'h-13 px-7 text-base',
				icon: 'size-11',
				'icon-sm': 'size-9',
				'icon-lg': 'size-12'
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
