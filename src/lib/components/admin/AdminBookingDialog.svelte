<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { actionUrl } from '#lib/action.js';
	import { toast } from 'svelte-sonner';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import TimeSelect from '../TimeSelect.svelte';
	import DatePicker from '#lib/components/DatePicker.svelte';
	import Segmented from './Segmented.svelte';
	import {
		DAY_NAMES,
		formatLong,
		formatShort,
		formatTime,
		isValidDate,
		weekday,
		type ISODate
	} from '#lib/dates.js';

	interface Props {
		open: boolean;
		date: ISODate;
		start: number;
		openTime: number;
		closeTime: number;
	}

	let {
		open = $bindable(),
		date: initialDate,
		start: initialStart,
		openTime,
		closeTime
	}: Props = $props();

	let kind = $state<'booking' | 'block'>('booking');
	let repeat = $state<'once' | 'weekly'>('once');
	let date = $state('');
	let start = $state(0);
	let end = $state(0);
	let until = $state('');
	let name = $state('');
	let phone = $state('');
	let note = $state('');
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			kind = 'booking';
			repeat = 'once';
			date = initialDate;
			start = initialStart;
			end = Math.min(initialStart + 60, closeTime);
			until = '';
			name = phone = note = error = '';
		});
	});

	const startOptions = $derived(
		Array.from({ length: (closeTime - openTime) / 30 }, (_, i) => ({ value: openTime + i * 30 }))
	);
	const endOptions = $derived(
		Array.from({ length: (closeTime - openTime) / 30 }, (_, i) => ({
			value: openTime + (i + 1) * 30
		})).filter((o) => o.value > start)
	);
	$effect(() => {
		if (end <= start) end = Math.min(start + 60, closeTime);
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>{kind === 'block' ? 'Block out the court' : 'New booking'}</Dialog.Title>
			<Dialog.Description>
				{kind === 'block'
					? 'Nobody will be able to book while the court is blocked out.'
					: 'Phone number is optional. Without one, only the post office can cancel it.'}
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action={actionUrl('book')}
			class="flex flex-col gap-5"
			use:enhance={() => {
				busy = true;
				error = '';
				return async ({ result, update }) => {
					busy = false;
					if (result.type === 'success') {
						open = false;
						const skipped = (result.data?.skipped ?? []) as string[];
						toast.success(kind === 'block' ? 'Court blocked out' : 'Booking added', {
							description: skipped.length
								? `Skipped ${skipped.map(formatShort).join(', ')}: already booked.`
								: undefined,
							duration: skipped.length ? 12000 : 4000
						});
						await update();
					} else if (result.type === 'failure') {
						error = String(result.data?.error ?? 'Something went wrong.');
					} else {
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="kind" value={kind} />
			<input type="hidden" name="repeat" value={repeat} />
			<input type="hidden" name="start" value={formatTime(start)} />
			<input type="hidden" name="end" value={formatTime(end)} />

			<Segmented
				label="Type"
				bind:value={kind}
				options={[
					{ value: 'booking', label: 'Booking' },
					{ value: 'block', label: 'Block out court' }
				]}
			/>

			<div class="flex flex-col gap-2">
				<Label for="a-date">{repeat === 'weekly' ? 'First week' : 'Day'}</Label>
				<DatePicker id="a-date" name="date" bind:value={date} required />
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="flex flex-col gap-2">
					<Label for="a-start">From</Label>
					<TimeSelect id="a-start" bind:value={start} options={startOptions} />
				</div>
				<div class="flex flex-col gap-2">
					<Label for="a-end">Until</Label>
					<TimeSelect id="a-end" bind:value={end} options={endOptions} />
				</div>
			</div>

			<Segmented
				label="Repeat"
				bind:value={repeat}
				options={[
					{ value: 'once', label: 'Just once' },
					{
						value: 'weekly',
						label: isValidDate(date) ? `Every ${DAY_NAMES[weekday(date)]}` : 'Every week'
					}
				]}
			/>

			{#if repeat === 'weekly'}
				<div class="flex flex-col gap-2 rounded-2xl bg-ice-100 p-4">
					<Label for="a-until">Last week (optional)</Label>
					<DatePicker
						id="a-until"
						name="until"
						min={date}
						bind:value={until}
						shortcuts={false}
						placeholder="No end date"
					/>
					<p class="text-[0.95rem] text-ink-soft">
						Leave empty to carry on until you stop it. Weeks that are already booked will be
						skipped.
					</p>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Label for="a-name">{kind === 'block' ? 'Reason (shown to everyone)' : 'Name'}</Label>
				<Input
					id="a-name"
					name="name"
					bind:value={name}
					required
					maxlength={60}
					placeholder={kind === 'block' ? 'e.g. Court maintenance, Coaching' : 'e.g. John Smith'}
				/>
			</div>

			{#if kind === 'booking'}
				<div class="flex flex-col gap-2">
					<Label for="a-phone">Phone number (optional)</Label>
					<Input
						id="a-phone"
						name="phone"
						type="tel"
						inputmode="tel"
						bind:value={phone}
						placeholder="So they can cancel it themselves"
					/>
				</div>
			{/if}

			<div class="flex flex-col gap-2">
				<Label for="a-note">Note (optional, shown to everyone)</Label>
				<Textarea id="a-note" name="note" bind:value={note} maxlength={200} rows={2} />
			</div>

			{#if error}
				<p
					role="alert"
					class="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-lg font-semibold text-destructive"
				>
					<TriangleAlert class="mt-1 size-5 shrink-0" />
					{error}
				</p>
			{/if}

			<Dialog.Footer>
				<Button variant="outline" size="lg" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" size="lg" disabled={busy}>
					{busy ? 'Saving…' : kind === 'block' ? 'Block out' : 'Add booking'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
