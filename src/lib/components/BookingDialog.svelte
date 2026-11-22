<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { actionUrl } from '#lib/action.js';
	import CircleCheck from '@lucide/svelte/icons/circle-check-big';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import TimeSelect from './TimeSelect.svelte';
	import { device } from '#lib/device.svelte.js';
	import {
		addDays,
		formatDuration,
		formatLong,
		formatRange,
		formatTime,
		isValidDate,
		startOfWeek,
		type ISODate
	} from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';

	interface Props {
		open: boolean;
		date: ISODate;
		start: number;
		today: ISODate;
		nowMinutes: number;
		weekStart: ISODate;
		slots: Slot[];
		openTime: number;
		closeTime: number;
		contact: string;
	}

	let {
		open = $bindable(),
		date: initialDate,
		start: initialStart,
		today,
		nowMinutes,
		weekStart,
		slots,
		openTime,
		closeTime,
		contact
	}: Props = $props();

	let date = $state('');
	let start = $state(0);
	let duration = $state(60);
	/** True when the person picks their own finish time instead of a preset. */
	let custom = $state(false);
	let name = $state('');
	let phone = $state('');
	let remember = $state(true);
	let error = $state('');
	let busy = $state(false);
	let booked = $state<Slot | null>(null);

	// Fresh form every time the dialog opens.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			date = initialDate;
			start = initialStart;
			duration = 60;
			custom = false;
			name = device.name;
			phone = device.phone;
			remember = true;
			error = '';
			booked = null;
			fitDuration();
		});
	});

	// We only know about bookings in the week on screen. The server double-checks everything.
	const known = $derived(isValidDate(date) && startOfWeek(date) === weekStart);
	const daySlots = $derived(known ? slots.filter((s) => s.date === date) : []);
	const overlaps = (s: number, e: number) => daySlots.find((x) => x.start < e && x.end > s);
	const earliest = $derived(date === today ? Math.floor(nowMinutes / 30) * 30 : openTime);

	const startOptions = $derived.by(() => {
		const out = [];
		for (let m = openTime; m < closeTime; m += 30) {
			if (m < earliest) continue;
			const taken = overlaps(m, m + 30);
			out.push({ value: m, disabled: !!taken, hint: taken ? 'booked' : undefined });
		}
		return out;
	});

	/** Longest booking anyone can make online (the server checks this too). */
	const MAX_LENGTH = 6 * 60;
	const fits = (d: number) =>
		d <= MAX_LENGTH && start + d <= closeTime && !overlaps(start, start + d);

	const durations = $derived([30, 60, 90, 120].map((d) => ({ value: d, ok: fits(d) })));

	const finishOptions = $derived.by(() => {
		const out = [];
		for (let e = start + 30; e <= Math.min(closeTime, start + MAX_LENGTH); e += 30) {
			const taken = overlaps(start, e);
			out.push({ value: e, disabled: !!taken, hint: taken ? 'booked' : undefined });
		}
		return out;
	});

	/** If the chosen length no longer fits, pick one that does. */
	function fitDuration() {
		if (fits(duration)) return;
		if (custom) {
			// Shorten to just before the next booking or closing time.
			let d = 30;
			while (fits(d + 30)) d += 30;
			duration = d;
		} else {
			duration = [60, 30, 90, 120].find(fits) ?? 60;
		}
	}

	// Changing the day or start time may mean the chosen length no longer fits.
	$effect(() => {
		void start;
		void daySlots;
		untrack(fitDuration);
	});

	const clash = $derived(overlaps(start, start + duration));
	const past = $derived(date < today || (date === today && start < earliest));
	const maxDate = $derived(addDays(today, 366));
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		{#if booked}
			<div class="flex flex-col items-center gap-4 py-2 text-center">
				<div
					class="grid size-20 place-items-center rounded-full bg-ball shadow-[0_10px_30px_-10px_oklch(0.6_0.15_125)]"
				>
					<CircleCheck class="size-11 text-ink" />
				</div>
				<Dialog.Title class="pr-0 text-3xl">You’re booked!</Dialog.Title>
				<div class="w-full rounded-2xl bg-ice-100 p-5 text-xl">
					<p class="font-bold">{formatLong(booked.date)}</p>
					<p class="mt-1 font-semibold tabular-nums">{formatRange(booked.start, booked.end)}</p>
					<p class="mt-1 text-ink-soft">for {booked.name}</p>
				</div>
				<Dialog.Description class="text-base">
					Need to cancel? Tap your booking on the calendar and type in your phone number.
					{#if contact}<br />{contact}{/if}
				</Dialog.Description>
				<Button size="lg" class="w-full" onclick={() => (open = false)}>Done</Button>
			</div>
		{:else}
			<Dialog.Header>
				<Dialog.Title>Book the court</Dialog.Title>
				<Dialog.Description>Choose a day and time, then tell us who you are.</Dialog.Description>
			</Dialog.Header>

			<form
				method="POST"
				action={actionUrl('book', '/')}
				class="flex flex-col gap-5"
				use:enhance={() => {
					busy = true;
					error = '';
					return async ({ result, update }) => {
						busy = false;
						if (result.type === 'success' && result.data?.booked) {
							const slot = result.data.booked as Slot;
							booked = slot;
							device.addMine(slot.id);
							if (remember) device.remember(name.trim(), phone.trim());
							else device.forget();
							await update({ reset: false });
						} else if (result.type === 'failure') {
							error = String(result.data?.error ?? 'Something went wrong. Please try again.');
						} else {
							await update();
						}
					};
				}}
			>
				<div class="flex flex-col gap-2">
					<Label for="b-date">Day</Label>
					<Input
						id="b-date"
						name="date"
						type="date"
						min={today}
						max={maxDate}
						bind:value={date}
						required
					/>
					{#if isValidDate(date)}
						<p class="text-base font-semibold text-ink-soft">{formatLong(date, true)}</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<Label for="b-start">Start time</Label>
					<TimeSelect id="b-start" bind:value={start} options={startOptions} />
					<input type="hidden" name="start" value={formatTime(start)} />
				</div>

				<fieldset class="flex flex-col gap-2">
					<legend class="mb-2 text-base font-bold">How long?</legend>
					<input type="hidden" name="duration" value={duration} />
					<div class="grid grid-cols-2 gap-2">
						{#each durations as d (d.value)}
							<label
								class={[
									'choice',
									!custom && duration === d.value && 'chosen',
									!d.ok && 'cursor-not-allowed opacity-40'
								]}
							>
								<input
									type="radio"
									name="length-choice"
									class="sr-only"
									checked={!custom && duration === d.value}
									disabled={!d.ok}
									onchange={() => {
										custom = false;
										duration = d.value;
									}}
								/>
								{formatDuration(d.value)}
							</label>
						{/each}
						<label class={['choice col-span-2', custom && 'chosen']}>
							<input
								type="radio"
								name="length-choice"
								class="sr-only"
								checked={custom}
								onchange={() => (custom = true)}
							/>
							Custom: choose a finish time
						</label>
					</div>

					{#if custom}
						<div class="mt-2 flex flex-col gap-2 rounded-2xl bg-ice-100 p-4">
							<Label for="b-finish">Finish time</Label>
							<TimeSelect
								id="b-finish"
								bind:value={() => start + duration, (v) => (duration = v - start)}
								options={finishOptions}
							/>
							<p class="text-[0.95rem] text-ink-soft">
								{formatDuration(duration)} in total. You can book up to 6 hours at a time.
							</p>
						</div>
					{/if}
				</fieldset>

				{#if clash}
					<p
						class="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 font-semibold text-destructive"
					>
						<TriangleAlert class="mt-0.5 size-5 shrink-0" />
						That time is already booked ({formatRange(clash.start, clash.end)}). Please choose
						another.
					</p>
				{:else if isValidDate(date)}
					<p class="rounded-xl bg-ice-100 px-4 py-3 text-lg font-bold tabular-nums">
						{formatLong(date)}, {formatRange(start, start + duration)}
					</p>
				{/if}

				<div class="flex flex-col gap-2">
					<Label for="b-name">Your name</Label>
					<Input
						id="b-name"
						name="name"
						autocomplete="name"
						bind:value={name}
						required
						maxlength={60}
						placeholder="e.g. Margaret Jones"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="b-phone">Your phone number</Label>
					<Input
						id="b-phone"
						name="phone"
						type="tel"
						inputmode="tel"
						autocomplete="tel"
						bind:value={phone}
						required
						placeholder="e.g. 07700 900123"
					/>
					<p class="text-[0.95rem] leading-snug text-ink-soft">
						You’ll need this number to cancel. Only the post office can see it.
					</p>
				</div>

				<label class="flex items-center gap-3 text-base font-semibold">
					<input type="checkbox" bind:checked={remember} class="size-6 rounded accent-(--ink)" />
					Remember my name and number on this device
				</label>

				{#if error}
					<p
						role="alert"
						class="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-lg font-semibold text-destructive"
					>
						<TriangleAlert class="mt-1 size-5 shrink-0" />
						{error}
					</p>
				{/if}

				<Button type="submit" size="xl" class="w-full" disabled={busy || !!clash || past}>
					{busy ? 'Booking…' : 'Book the court'}
				</Button>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.choice {
		display: flex;
		height: 3.25rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.875rem;
		border: 1px solid var(--input);
		background: oklch(1 0 0 / 0.85);
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--ink);
		cursor: pointer;
		transition: all 150ms;
	}
	.choice:hover {
		border-color: var(--glacier);
	}
	.choice:has(:focus-visible) {
		outline: 3px solid var(--glacier);
		outline-offset: 2px;
	}
	.choice.chosen {
		border-color: var(--ink);
		background: var(--ink);
		color: white;
		box-shadow: 0 6px 16px -8px oklch(0.27 0.045 250 / 0.8);
	}
</style>
