<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { actionUrl } from '#lib/action.js';
	import { toast } from 'svelte-sonner';
	import Phone from '@lucide/svelte/icons/phone';
	import Repeat from '@lucide/svelte/icons/repeat-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { DAY_NAMES, formatLong, formatRange, weekday } from '#lib/dates.js';
	import type { AdminSlot } from '#lib/types.js';

	let { open = $bindable(), slot }: { open: boolean; slot: AdminSlot | null } = $props();

	type Scope = 'once' | 'series';
	let confirming = $state<Scope | null>(null);
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			confirming = null;
			error = '';
		});
	});

	const what = $derived(slot?.kind === 'block' ? 'block-out' : 'booking');

	function confirmText(s: AdminSlot, scope: Scope) {
		if (scope === 'series') {
			return `Stop ${s.name}’s regular ${DAY_NAMES[weekday(s.date)]} ${what} from ${formatLong(s.date)} onwards?`;
		}
		if (s.recurring)
			return `Cancel ${s.name} on ${formatLong(s.date)} only? Other weeks stay booked.`;
		return s.kind === 'block'
			? `Remove this block-out so people can book again?`
			: `Cancel ${s.name}’s booking? ${s.phone ? 'You may want to let them know.' : ''}`;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		{#if slot}
			<Dialog.Header>
				<p class="text-xs font-medium tracking-[0.08em] text-ink-soft uppercase">
					{slot.kind === 'block' ? 'Court blocked out' : 'Booking'}
				</p>
				<Dialog.Title class="text-2xl">{slot.name}</Dialog.Title>
			</Dialog.Header>

			<div class="flex flex-col gap-1 rounded-2xl bg-raised/60 p-4 text-base">
				<p class="text-lg font-semibold">{formatLong(slot.date, true)}</p>
				<p class="text-lg font-semibold tabular-nums">{formatRange(slot.start, slot.end)}</p>
				{#if slot.recurring}
					<p
						class="mt-2 inline-flex items-center gap-2 self-start rounded-md bg-(--slot-regular) px-2 py-0.5 text-sm font-medium"
					>
						<Repeat class="size-4" /> Every {DAY_NAMES[weekday(slot.date)]}
					</p>
				{/if}
				{#if slot.phone}
					<a
						href="tel:{slot.phone}"
						class="mt-2 inline-flex items-center gap-2 font-semibold text-ink underline decoration-ball underline-offset-4"
					>
						<Phone class="size-5" />
						{slot.phone}
					</a>
				{:else if slot.kind === 'booking'}
					<p class="mt-2 text-ink-soft">No phone number given</p>
				{/if}
				{#if slot.note}<p class="mt-2 text-ink-soft">“{slot.note}”</p>{/if}
				<p class="mt-2 text-[0.95rem] text-ink-soft">
					{slot.recurring ? 'Set up' : 'Booked'}
					{slot.createdBy === 'admin' ? 'by the post office' : 'online'}
					on {new Date(slot.createdAt.replace(' ', 'T') + 'Z').toLocaleString('en-GB', {
						timeZone: 'Europe/London',
						dateStyle: 'medium',
						timeStyle: 'short'
					})}
				</p>
			</div>

			{#if confirming}
				<form
					method="POST"
					action={actionUrl('cancel')}
					class="flex flex-col gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
					use:enhance={() => {
						busy = true;
						error = '';
						return async ({ result, update }) => {
							busy = false;
							if (result.type === 'success') {
								open = false;
								toast.success(confirming === 'series' ? 'Regular booking stopped' : 'Cancelled');
								await update();
							} else if (result.type === 'failure') {
								error = String(result.data?.error ?? 'Something went wrong.');
							} else {
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={slot.id} />
					<input type="hidden" name="scope" value={confirming} />
					<input type="hidden" name="seriesId" value={slot.seriesId ?? ''} />
					<input type="hidden" name="date" value={slot.date} />
					<p class="text-base font-semibold">{confirmText(slot, confirming)}</p>
					{#if error}
						<p role="alert" class="flex items-start gap-2 font-semibold text-destructive">
							<TriangleAlert class="mt-1 size-5 shrink-0" />{error}
						</p>
					{/if}
					<div class="flex flex-col-reverse gap-3 sm:flex-row">
						<Button variant="outline" size="lg" class="flex-1" onclick={() => (confirming = null)}>
							No, go back
						</Button>
						<Button type="submit" variant="destructive" size="lg" class="flex-1" disabled={busy}>
							{busy ? 'Working…' : 'Yes'}
						</Button>
					</div>
				</form>
			{:else}
				<div class="flex flex-col gap-3">
					{#if slot.recurring}
						<Button variant="outline" size="lg" onclick={() => (confirming = 'once')}>
							Cancel just this week
						</Button>
						<Button
							variant="outline"
							size="lg"
							class="text-destructive"
							onclick={() => (confirming = 'series')}
						>
							Stop it from this week on
						</Button>
					{:else}
						<Button
							variant="outline"
							size="lg"
							class="text-destructive"
							onclick={() => (confirming = 'once')}
						>
							{slot.kind === 'block' ? 'Remove block-out' : 'Cancel booking'}
						</Button>
					{/if}
					<Button size="lg" onclick={() => (open = false)}>Close</Button>
				</div>
			{/if}
		{/if}
	</Dialog.Content>
</Dialog.Root>
