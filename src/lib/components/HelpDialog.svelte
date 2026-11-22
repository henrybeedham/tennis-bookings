<script lang="ts">
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CircleX from '@lucide/svelte/icons/circle-x';
	import Phone from '@lucide/svelte/icons/phone';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { Button } from '#lib/components/ui/button/index.js';

	let {
		open = $bindable(),
		contact,
		onbook
	}: {
		open: boolean;
		contact: string;
		/** Closes help and opens the booking form. */
		onbook: () => void;
	} = $props();

	const steps = [
		'Tap a free time on the calendar, or the “Book the court” button at the top.',
		'Choose how long you want the court for.',
		'Type your name and phone number, then tap “Book the court”.',
		'That’s it. The time is yours. Get the key as usual.'
	];
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>How it works</Dialog.Title>
			<Dialog.Description>No account or password needed.</Dialog.Description>
		</Dialog.Header>

		<section class="flex flex-col gap-3">
			<h3 class="flex items-center gap-2 text-sm font-medium text-ink-soft">
				<CalendarPlus class="size-4" /> Booking
			</h3>
			<ol class="flex flex-col gap-3">
				{#each steps as step, i (i)}
					<li class="flex gap-3">
						<span
							class="grid size-7 shrink-0 place-items-center rounded-full bg-ball text-sm font-semibold text-on-ball tabular-nums"
						>
							{i + 1}
						</span>
						<span class="pt-0.5 leading-relaxed">{step}</span>
					</li>
				{/each}
			</ol>
		</section>

		<section class="flex flex-col gap-2 rounded-2xl bg-raised/60 p-4">
			<h3 class="flex items-center gap-2 text-sm font-medium text-ink-soft">
				<CircleX class="size-4" /> Cancelling
			</h3>
			<p class="leading-relaxed">
				Tap your booking on the calendar, then type in the phone number you booked with.
			</p>
		</section>

		<section class="flex flex-col gap-2 rounded-2xl bg-raised/60 p-4">
			<h3 class="flex items-center gap-2 text-sm font-medium text-ink-soft">
				<Phone class="size-4" /> Need a hand?
			</h3>
			<p class="leading-relaxed">
				{contact ||
					'Can’t use the website? Pop into the post office and they’ll book the court for you.'}
			</p>
		</section>

		<div class="flex flex-col gap-3">
			<Button variant="ball" size="lg" class="w-full" onclick={onbook}>
				<CalendarPlus />
				Book the court
			</Button>
			<a
				href="/post-office"
				class="self-center rounded-sm text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
			>
				Post office login
			</a>
		</div>
	</Dialog.Content>
</Dialog.Root>
