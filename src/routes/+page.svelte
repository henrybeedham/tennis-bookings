<script lang="ts">
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import { Button } from '#lib/components/ui/button/index.js';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import Notice from '#lib/components/Notice.svelte';
	import Planner from '#lib/components/Planner.svelte';
	import BookingDialog from '#lib/components/BookingDialog.svelte';
	import SlotDialog from '#lib/components/SlotDialog.svelte';
	import HelpDialog from '#lib/components/HelpDialog.svelte';
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

	let helpOpen = $state(false);
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
	<Button
		variant="ghost"
		size="sm"
		class="h-10 px-3 text-ink max-sm:px-2.5"
		onclick={() => (helpOpen = true)}
	>
		<CircleHelp class="max-sm:hidden" />
		Help
	</Button>
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

<HelpDialog
	bind:open={helpOpen}
	contact={s.contact}
	onbook={() => {
		helpOpen = false;
		book(day);
	}}
/>
