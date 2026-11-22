<script lang="ts">
	import { page } from '$app/state';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import Settings from '@lucide/svelte/icons/settings-2';
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

	// For the preview card in iMessage, WhatsApp and so on. Links in it must be full addresses.
	const DESCRIPTION =
		'Tap a free time, add your name and number, and it’s booked. No account needed.';
	// Bump ?v= when the image changes: WhatsApp and iMessage keep old previews for a long time.
	const ogImage = $derived(`${page.url.origin}/og.jpg?v=1`);

	let bookOpen = $state(false);
	let bookDate = $state<ISODate>('');
	let bookStart = $state(0);
	let changing = $state<Slot | null>(null);

	/** The day showing on the calendar, used by the Book buttons. */
	let day = $state<ISODate>('');

	let helpOpen = $state(false);
	let slotOpen = $state(false);
	let selected = $state<Slot | null>(null);

	function book(date: ISODate, start?: number) {
		changing = null;
		date ||= data.focus;
		bookDate = date < data.today ? data.today : date;
		bookStart =
			start ?? firstFreeStart(data.slots, bookDate, data.today, data.nowMinutes, s.open, s.close);
		bookOpen = true;
	}

	function change(slot: Slot) {
		slotOpen = false;
		changing = slot;
		bookOpen = true;
	}

	function show(slot: Slot) {
		selected = slot;
		slotOpen = true;
	}
</script>

<svelte:head>
	<title>{s.title} · Book the court</title>
	<meta name="description" content={DESCRIPTION} />
	<link rel="canonical" href="{page.url.origin}/" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={s.title} />
	<meta property="og:title" content="{s.title} · Book the court" />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:url" content="{page.url.origin}/" />
	<meta property="og:locale" content="en_GB" />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:type" content="image/jpeg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="A tennis ball on a court: Book the tennis court" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<SiteHeader title={s.title} secret="/post-office">
	{#if data.admin}
		<Button
			variant="ghost"
			size="sm"
			class="h-10 px-3 text-ink max-sm:px-2.5"
			href="/post-office"
			aria-label="Post office"
		>
			<Settings />
			<span class="max-sm:hidden">Admin</span>
		</Button>
	{/if}
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

<!-- On desktop the page is exactly the window height; only the calendar scrolls, if anything. -->
<div
	class="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 pb-12 sm:px-6 sm:pt-10 md:h-[calc(100dvh-var(--nav-offset))] md:gap-3 md:pt-3 md:pb-4"
>
	{#if s.notice}<Notice text={s.notice} />{/if}

	<Planner
		view={data.view}
		from={data.from}
		to={data.to}
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
		fit
	/>
</div>

<BookingDialog
	bind:open={bookOpen}
	date={bookDate}
	start={bookStart}
	today={data.today}
	nowMinutes={data.nowMinutes}
	from={data.from}
	to={data.to}
	slots={data.slots}
	openTime={s.open}
	closeTime={s.close}
	contact={s.contact}
	editing={changing}
/>

<SlotDialog
	bind:open={slotOpen}
	slot={selected}
	today={data.today}
	nowMinutes={data.nowMinutes}
	contact={s.contact}
	onchange={change}
/>

<HelpDialog
	bind:open={helpOpen}
	contact={s.contact}
	onbook={() => {
		helpOpen = false;
		book(day);
	}}
/>
