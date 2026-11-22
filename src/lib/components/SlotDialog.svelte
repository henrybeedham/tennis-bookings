<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { actionUrl } from '#lib/action.js';
	import { toast } from 'svelte-sonner';
	import Repeat from '@lucide/svelte/icons/repeat-2';
	import Lock from '@lucide/svelte/icons/lock';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { device } from '#lib/device.svelte.js';
	import { DAY_NAMES, formatLong, formatRange, weekday, type ISODate } from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';

	let {
		open = $bindable(),
		slot,
		today,
		nowMinutes,
		contact
	}: {
		open: boolean;
		slot: Slot | null;
		today: ISODate;
		nowMinutes: number;
		contact: string;
	} = $props();

	let step = $state<'view' | 'confirm'>('view');
	let phone = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			step = 'view';
			phone = device.phone;
			error = '';
		});
	});

	const started = $derived(
		!!slot && (slot.date < today || (slot.date === today && slot.start <= nowMinutes))
	);
	const finished = $derived(
		!!slot && (slot.date < today || (slot.date === today && slot.end <= nowMinutes))
	);
	const yours = $derived(!!slot && device.mine.has(slot.id));
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		{#if slot}
			<Dialog.Header>
				{#if slot.kind === 'block'}
					<Dialog.Title class="flex items-center gap-2">
						<Lock class="size-6" /> Court not available
					</Dialog.Title>
				{:else}
					<p class="text-base font-bold tracking-wide text-ink-soft uppercase">
						{yours ? 'Your booking' : 'Booked by'}
					</p>
					<Dialog.Title class="text-3xl">{slot.name}</Dialog.Title>
				{/if}
			</Dialog.Header>

			<div class="rounded-2xl bg-ice-100 p-5">
				{#if slot.kind === 'block'}<p class="mb-1 text-xl font-bold">{slot.name}</p>{/if}
				<p class="text-xl font-bold">{formatLong(slot.date)}</p>
				<p class="mt-1 text-xl font-semibold tabular-nums">{formatRange(slot.start, slot.end)}</p>
				{#if slot.recurring}
					<p
						class="mt-3 inline-flex items-center gap-2 rounded-full bg-(--slot-regular) px-3 py-1 font-bold"
					>
						<Repeat class="size-4" /> Every {DAY_NAMES[weekday(slot.date)]}
					</p>
				{/if}
				{#if slot.note}<p class="mt-3 text-lg text-ink-soft">{slot.note}</p>{/if}
			</div>

			{#if slot.kind === 'block'}
				<Dialog.Description>
					The post office has reserved the court for this time.
				</Dialog.Description>
			{:else if finished}
				<Dialog.Description>This booking has finished.</Dialog.Description>
			{:else if !slot.cancellable}
				<Dialog.Description>
					This was booked at the post office. To change or cancel it, please ask them.
					{#if contact}<br />{contact}{/if}
				</Dialog.Description>
			{:else if step === 'view'}
				{#if started}
					<Dialog.Description>
						This booking is happening now. If you’ve finished early, you can cancel it to free up
						the court.
					</Dialog.Description>
				{/if}
				<Button variant="outline" size="lg" class="w-full" onclick={() => (step = 'confirm')}>
					Cancel this booking
				</Button>
			{:else}
				<form
					method="POST"
					action={actionUrl('cancel', '/')}
					class="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-5"
					use:enhance={() => {
						busy = true;
						error = '';
						return async ({ result, update }) => {
							busy = false;
							if (result.type === 'success') {
								device.removeMine(slot.id);
								open = false;
								toast.success('Booking cancelled');
								await update();
							} else if (result.type === 'failure') {
								error = String(result.data?.error ?? 'Something went wrong. Please try again.');
							} else {
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={slot.id} />
					<p class="text-lg font-semibold">
						{#if started}
							This frees the court for the rest of the time. Type the phone number used to make the
							booking.
						{:else if slot.recurring}
							This cancels {formatLong(slot.date)} only. The regular booking carries on in other weeks.
						{:else}
							To cancel, type the phone number used to make the booking.
						{/if}
					</p>
					<div class="flex flex-col gap-2">
						<Label for="c-phone">Phone number</Label>
						<Input
							id="c-phone"
							name="phone"
							type="tel"
							inputmode="tel"
							autocomplete="tel"
							bind:value={phone}
							required
						/>
					</div>
					{#if error}
						<p role="alert" class="flex items-start gap-2 text-lg font-semibold text-destructive">
							<TriangleAlert class="mt-1 size-5 shrink-0" />
							{error}
						</p>
					{/if}
					<div class="flex flex-col-reverse gap-3 sm:flex-row">
						<Button variant="outline" size="lg" class="flex-1" onclick={() => (step = 'view')}>
							Keep it
						</Button>
						<Button type="submit" variant="destructive" size="lg" class="flex-1" disabled={busy}>
							{busy ? 'Cancelling…' : 'Yes, cancel it'}
						</Button>
					</div>
				</form>
			{/if}

			{#if step === 'view'}
				<Button size="lg" class="w-full" onclick={() => (open = false)}>Close</Button>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
