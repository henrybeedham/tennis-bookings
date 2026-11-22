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

	/** The day showing on the calendar, used by the Book buttons. */
	let day = $state<ISODate>('');

	let slotOpen = $state(false);
	let selected = $state<Slot | null>(null);

	function book(date: ISODate, start?: number) {
		date ||= data.focus;
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

<SiteHeader title={s.title}>
	<Button variant="ball" size="sm" class="h-10 px-4" onclick={() => book(day)}>
		<CalendarPlus />
		<span>Book<span class="max-sm:hidden">&nbsp;the court</span></span>
	</Button>
</SiteHeader>

<div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 pb-12 sm:px-6 sm:pt-10">
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
		ondaychange={(d) => (day = d)}
	/>

	<footer class="grid gap-8 border-t border-line px-1 pt-8 text-[0.9375rem] sm:grid-cols-3">
		<div>
			<h2 class="text-sm font-semibold">How to book</h2>
			<ol class="mt-3 flex flex-col gap-2 text-ink-soft">
				{#each ['Tap a free time on the calendar, or “Book the court”.', 'Choose how long, then enter your name and phone number.', 'The time is yours. Get the key as usual.'] as step, i (i)}
					<li class="flex gap-3">
						<span class="w-4 shrink-0 font-medium text-ink tabular-nums">{i + 1}</span>
						<span>{step}</span>
					</li>
				{/each}
			</ol>
		</div>
		<div>
			<h2 class="text-sm font-semibold">Cancelling</h2>
			<p class="mt-3 text-ink-soft">
				Tap your booking on the calendar and type in the phone number you booked with.
			</p>
		</div>
		<div>
			<h2 class="text-sm font-semibold">Need help?</h2>
			<p class="mt-3 text-ink-soft">
				{s.contact ||
					'Can’t use the website? Pop into the post office and they’ll book the court for you.'}
			</p>
			<a
				href="/post-office"
				class="mt-4 inline-block text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
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
