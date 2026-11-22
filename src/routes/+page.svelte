<script lang="ts">
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import { Button } from '#lib/components/ui/button/index.js';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import Notice from '#lib/components/Notice.svelte';
	import Planner from '#lib/components/Planner.svelte';
	import BookingDialog from '#lib/components/BookingDialog.svelte';
	import SlotDialog from '#lib/components/SlotDialog.svelte';
	import { device } from '#lib/device.svelte.js';
	import { firstFreeStart } from '#lib/slots.js';
	import type { ISODate } from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const s = $derived(data.settings);

	let bookOpen = $state(false);
	let bookDate = $state<ISODate>('');
	let bookStart = $state(0);

	let slotOpen = $state(false);
	let selected = $state<Slot | null>(null);

	function book(date: ISODate, start?: number) {
		bookDate = date < data.today ? data.today : date;
		bookStart =
			start ?? firstFreeStart(data.slots, bookDate, data.today, data.nowMinutes, s.open, s.close);
		bookOpen = true;
	}

	function show(slot: Slot) {
		selected = slot;
		slotOpen = true;
	}
</script>

<svelte:head>
	<title>{s.title} · Book the court</title>
	<meta name="description" content="Book the {s.title}. Tap a free time on the calendar." />
</svelte:head>

<div class="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-5 pb-10 sm:gap-6 sm:px-6 sm:pt-8">
	<SiteHeader title={s.title} subtitle="Tap a free time on the calendar to book the court." />

	{#if s.notice}<Notice text={s.notice} />{/if}

	<Planner
		weekStart={data.weekStart}
		focus={data.focus}
		today={data.today}
		nowMinutes={data.nowMinutes}
		slots={data.slots}
		open={s.open}
		close={s.close}
		mine={device.mine}
		onpick={book}
		onopen={show}
	>
		{#snippet actions(day)}
			<Button size="lg" class="max-md:w-full" onclick={() => book(day)}>
				<CalendarPlus class="size-6" />
				Book the court
			</Button>
		{/snippet}
	</Planner>

	<footer class="frost grid gap-6 rounded-3xl p-5 sm:grid-cols-[1.4fr_1fr] sm:p-7">
		<div>
			<h2 class="text-xl font-bold">How to book</h2>
			<ol class="mt-3 flex flex-col gap-3 text-lg">
				{#each ['Tap a free time on the calendar, or the “Book the court” button.', 'Choose how long, then enter your name and phone number.', 'That’s it! The time is yours. Get the key as usual.'] as step, i (i)}
					<li class="flex gap-3">
						<span class="grid size-8 shrink-0 place-items-center rounded-full bg-ice-200 font-bold">
							{i + 1}
						</span>
						<span class="pt-0.5">{step}</span>
					</li>
				{/each}
			</ol>
		</div>
		<div class="flex flex-col gap-3 text-lg">
			<h2 class="text-xl font-bold">Need help?</h2>
			<p>
				{s.contact ||
					'Can’t use the website? Pop into the post office and they’ll book the court for you.'}
			</p>
			<p class="text-base text-ink-soft">
				To cancel, tap your booking and type in your phone number.
			</p>
			<a
				href="/post-office"
				class="mt-auto self-start text-base text-ink-soft underline underline-offset-4 hover:text-ink"
			>
				Post office login
			</a>
		</div>
	</footer>
</div>

<BookingDialog
	bind:open={bookOpen}
	date={bookDate}
	start={bookStart}
	today={data.today}
	nowMinutes={data.nowMinutes}
	weekStart={data.weekStart}
	slots={data.slots}
	openTime={s.open}
	closeTime={s.close}
	contact={s.contact}
/>

<SlotDialog
	bind:open={slotOpen}
	slot={selected}
	today={data.today}
	nowMinutes={data.nowMinutes}
	contact={s.contact}
/>
