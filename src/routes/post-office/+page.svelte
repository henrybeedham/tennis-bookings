<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Search from '@lucide/svelte/icons/search';
	import Repeat from '@lucide/svelte/icons/repeat-2';
	import Settings from '@lucide/svelte/icons/settings-2';
	import History from '@lucide/svelte/icons/history';
	import Lock from '@lucide/svelte/icons/lock';
	import Phone from '@lucide/svelte/icons/phone';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Label } from '#lib/components/ui/label/index.js';
	import { Textarea } from '#lib/components/ui/textarea/index.js';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import Notice from '#lib/components/Notice.svelte';
	import Planner from '#lib/components/Planner.svelte';
	import TimeSelect from '#lib/components/TimeSelect.svelte';
	import Segmented from '#lib/components/admin/Segmented.svelte';
	import DatePicker from '#lib/components/DatePicker.svelte';
	import AdminBookingDialog from '#lib/components/admin/AdminBookingDialog.svelte';
	import AdminSlotDialog from '#lib/components/admin/AdminSlotDialog.svelte';
	import { firstFreeStart } from '#lib/slots.js';
	import {
		DAY_NAMES,
		formatLong,
		formatRange,
		formatShort,
		formatTime,
		type ISODate
	} from '#lib/dates.js';
	import type { AdminSlot, Slot } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let bookOpen = $state(false);
	let bookDate = $state<ISODate>('');
	let bookStart = $state(0);
	let bookWeekly = $state(false);
	let editing = $state<AdminSlot | null>(null);
	let editScope = $state<'once' | 'series'>('once');
	let slotOpen = $state(false);
	let selected = $state<AdminSlot | null>(null);
	const TABS = ['calendar', 'find', 'regular', 'settings', 'activity'];
	const requested = page.url.searchParams.get('tab') ?? '';
	// Opens on the tab named in ?tab=…, e.g. from the Settings button on the public page.
	let tab = $state(TABS.includes(requested) ? requested : 'calendar');
	let query = $state('');
	let stopping = $state<number | null>(null);
	let stopFrom = $state('');
	let saving = $state(false);

	function book(date: ISODate, start?: number, weekly = false) {
		if (!data.admin) return;
		bookWeekly = weekly;
		editing = null;
		bookDate = date;
		bookStart =
			start ??
			firstFreeStart(
				data.slots,
				date,
				data.today,
				data.nowMinutes,
				data.settings.open,
				data.settings.close
			);
		bookOpen = true;
	}

	function edit(slot: AdminSlot, scope: 'once' | 'series') {
		slotOpen = false;
		editing = slot;
		editScope = scope;
		bookOpen = true;
	}

	function show(slot: Slot | AdminSlot) {
		if (!data.admin) return;
		selected =
			'phone' in slot
				? slot
				: (data.slots.find((s) => s.id === slot.id) ??
					data.upcoming.find((s) => s.id === slot.id) ??
					null);
		slotOpen = !!selected;
	}

	const digits = (s: string) => s.replace(/\D/g, '');
	const results = $derived.by(() => {
		if (!data.admin) return [];
		const q = query.trim().toLowerCase();
		const list = data.upcoming.filter((s) => s.kind === 'booking');
		if (!q) return list.slice(0, 40);
		const qd = digits(q);
		return list.filter(
			(s) => s.name.toLowerCase().includes(q) || (qd.length >= 3 && s.phone?.includes(qd))
		);
	});

	const ALL_DAY = { open: 0, close: 24 * 60 };
	const openOptions = Array.from({ length: 48 }, (_, i) => ({ value: i * 30 }));
	const closeOptions = Array.from({ length: 48 }, (_, i) => ({ value: (i + 1) * 30 }));
	let hours = $state<'set' | 'always'>('set');
	let openTime = $state(0);
	let closeTime = $state(0);
	// Load the saved hours into the form. Only re-runs when the saved settings change,
	// so clicking the options doesn't get undone.
	$effect(() => {
		if (!data.admin) return;
		const { open, close } = data.settings;
		const always = open === ALL_DAY.open && close === ALL_DAY.close;
		untrack(() => {
			hours = always ? 'always' : 'set';
			openTime = always ? 8 * 60 : open;
			closeTime = always ? 21 * 60 : close;
		});
	});

	function when(at: string) {
		return new Date(at.replace(' ', 'T') + 'Z').toLocaleString('en-GB', {
			timeZone: 'Europe/London',
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/** Saves a settings-style form and shows a toast. */
	const saveForm = (message: string) => () => {
		saving = true;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (o?: { reset?: boolean }) => Promise<void>;
		}) => {
			saving = false;
			if (result.type === 'success') {
				toast.success(message);
				stopping = null;
			} else if (result.type === 'failure') {
				toast.error(String(result.data?.error ?? 'Something went wrong.'));
			}
			await update({ reset: false });
		};
	};
</script>

<svelte:head>
	<title>Post office · {data.admin ? data.settings.title : 'Log in'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if !data.admin}
	<main class="grid min-h-dvh place-items-center px-4 py-10">
		<form
			method="POST"
			action="?/login"
			use:enhance
			class="panel flex w-full max-w-sm flex-col gap-5 rounded-3xl p-7"
		>
			<div class="grid size-11 place-items-center rounded-2xl bg-ball text-on-ball">
				<Lock class="size-5" />
			</div>
			<div>
				<h1 class="text-2xl font-semibold">Post office</h1>
				<p class="mt-1 text-base text-ink-soft">Log in to manage all court bookings.</p>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="pw">Password</Label>
				<Input id="pw" name="password" type="password" autocomplete="current-password" required />
			</div>
			{#if form && 'error' in form && form.error}
				<p role="alert" class="flex items-center gap-2 font-semibold text-destructive">
					<TriangleAlert class="size-5" />{form.error}
				</p>
			{/if}
			<Button type="submit" size="lg">Log in</Button>
			<a href="/" class="text-center text-ink-soft underline underline-offset-4">
				Back to the booking calendar
			</a>
		</form>
	</main>
{:else}
	<SiteHeader title="Post office" href="/post-office">
		<Button variant="ghost" size="sm" class="h-10 max-sm:hidden" href="/">Public calendar</Button>
		<form method="POST" action="?/logout">
			<Button type="submit" variant="outline" size="sm" class="h-10">Log out</Button>
		</form>
	</SiteHeader>

	<div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-10 pb-12 sm:px-6">
		<div class="flex flex-col gap-1">
			<p class="text-sm text-ink-soft">{data.settings.title}</p>
			<h1 class="text-fade text-4xl font-semibold tracking-[-0.04em]">Bookings</h1>
		</div>

		{#if data.settings.notice}<Notice text={data.settings.notice} />{/if}

		<Tabs.Root bind:value={tab} class="flex flex-col gap-5">
			<Tabs.List class="max-sm:grid max-sm:w-full max-sm:grid-cols-5">
				<Tabs.Trigger value="calendar"><CalendarDays />Calendar</Tabs.Trigger>
				<Tabs.Trigger value="find"><Search />Find</Tabs.Trigger>
				<Tabs.Trigger value="regular"><Repeat />Regular</Tabs.Trigger>
				<Tabs.Trigger value="settings"><Settings />Settings</Tabs.Trigger>
				<Tabs.Trigger value="activity"><History />Activity</Tabs.Trigger>
			</Tabs.List>

			<!-- Calendar -->
			<Tabs.Content value="calendar">
				<Planner
					view={data.view}
					from={data.from}
					to={data.to}
					focus={data.focus}
					today={data.today}
					nowMinutes={data.nowMinutes}
					slots={data.slots}
					open={data.settings.open}
					close={data.settings.close}
					allowPast
					onpick={book}
					onopen={show}
				>
					{#snippet actions(day)}
						<Button variant="ball" class="max-md:w-full" onclick={() => book(day)}>
							<CalendarPlus class="size-[1.125rem]" />
							New booking
						</Button>
					{/snippet}
				</Planner>
			</Tabs.Content>

			<!-- Find a booking -->
			<Tabs.Content value="find" class="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-7">
				<div>
					<h2 class="text-lg font-semibold tracking-[-0.01em]">Find a booking</h2>
					<p class="text-base text-ink-soft">Search upcoming bookings by name or phone number.</p>
				</div>
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft"
					/>
					<Input
						bind:value={query}
						placeholder="e.g. Margaret, or 07700"
						class="pl-12"
						aria-label="Search"
					/>
				</div>
				{#if results.length === 0}
					<p class="py-6 text-center text-base text-ink-soft">No upcoming bookings found.</p>
				{:else}
					<ul class="flex flex-col divide-y divide-line">
						{#each results as s (s.id)}
							<li>
								<button
									type="button"
									class="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl px-3 py-3 text-left hover:bg-raised"
									onclick={() => show(s)}
								>
									<span class="min-w-48 flex-1">
										<span class="flex items-center gap-2 text-base font-semibold">
											{s.name}
											{#if s.recurring}<Repeat class="size-4 text-ink-soft" />{/if}
										</span>
										{#if s.phone}<span class="text-ink-soft">{s.phone}</span>{/if}
									</span>
									<span class="text-base font-semibold tabular-nums">
										{formatLong(s.date)} · {formatRange(s.start, s.end)}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</Tabs.Content>

			<!-- Regular bookings -->
			<Tabs.Content value="regular" class="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-7">
				<div class="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 class="text-lg font-semibold tracking-[-0.01em]">Regular weekly bookings</h2>
						<p class="text-base text-ink-soft">
							To add one, use “New booking” and choose “Every week”.
						</p>
					</div>
					<Button variant="ball" onclick={() => book(data.today, undefined, true)}>
						<CalendarPlus />New booking
					</Button>
				</div>
				{#if data.series.length === 0}
					<p class="py-6 text-center text-base text-ink-soft">No regular bookings yet.</p>
				{:else}
					<ul class="flex flex-col gap-3">
						{#each data.series as r (r.id)}
							<li class="flex flex-col gap-3 rounded-2xl border border-line bg-raised/40 p-4">
								<div class="flex flex-wrap items-start gap-x-6 gap-y-2">
									<div class="min-w-52 flex-1">
										<p class="flex items-center gap-2 text-lg font-semibold">
											{#if r.kind === 'block'}<Lock class="size-5" />{/if}
											{r.name}
										</p>
										{#if r.phone}
											<a
												href="tel:{r.phone}"
												class="inline-flex items-center gap-1.5 text-ink-soft underline underline-offset-4"
											>
												<Phone class="size-4" />{r.phone}
											</a>
										{/if}
									</div>
									<div class="text-base">
										<p class="font-semibold">
											Every {DAY_NAMES[r.weekday]}, {formatRange(r.start, r.end)}
										</p>
										<p class="text-ink-soft">
											From {formatShort(r.startDate)}{r.endDate
												? ` until ${formatShort(r.endDate)}`
												: ', no end date'}
										</p>
									</div>
									{#if stopping !== r.id}
										<Button
											variant="outline"
											class="text-destructive"
											onclick={() => {
												stopping = r.id;
												stopFrom = data.today > r.startDate ? data.today : r.startDate;
											}}
										>
											Stop…
										</Button>
									{/if}
								</div>
								{#if stopping === r.id}
									<form
										method="POST"
										action="?/endSeries"
										class="flex flex-wrap items-end gap-3 rounded-2xl bg-destructive/5 p-4"
										use:enhance={saveForm('Regular booking stopped')}
									>
										<input type="hidden" name="seriesId" value={r.id} />
										<div class="flex min-w-56 flex-1 flex-col gap-2">
											<Label for="stop-{r.id}">No more bookings from</Label>
											<DatePicker id="stop-{r.id}" name="from" bind:value={stopFrom} required />
										</div>
										<Button variant="outline" onclick={() => (stopping = null)}>Keep it</Button>
										<Button type="submit" variant="destructive" disabled={saving}>
											Stop booking
										</Button>
									</form>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Tabs.Content>

			<!-- Settings -->
			<Tabs.Content value="settings" class="panel rounded-3xl p-5 sm:p-7">
				<form
					method="POST"
					action="?/settings"
					class="flex max-w-2xl flex-col gap-6"
					use:enhance={saveForm('Settings saved')}
				>
					<h2 class="text-lg font-semibold tracking-[-0.01em]">Settings</h2>

					<div class="flex flex-col gap-2">
						<Label for="s-notice">Notice at the top of the website</Label>
						<Textarea
							id="s-notice"
							name="notice"
							value={data.settings.notice}
							maxlength={300}
							rows={3}
							placeholder="e.g. The court is closed on Tuesday for repainting."
						/>
						<p class="text-ink-soft">Leave empty to hide the notice.</p>
					</div>

					<div class="flex flex-col gap-2">
						<Label for="s-contact">Help message</Label>
						<Textarea
							id="s-contact"
							name="contact"
							value={data.settings.contact}
							maxlength={300}
							rows={2}
							placeholder="Can’t use the website? Pop into the post office (01234 567890) and we’ll book for you."
						/>
						<p class="text-ink-soft">Shown at the bottom of the page and after someone books.</p>
					</div>

					<div class="flex flex-col gap-3">
						<Segmented
							label="Opening hours"
							bind:value={hours}
							options={[
								{ value: 'set', label: 'Set hours' },
								{ value: 'always', label: 'Open all the time' }
							]}
						/>
						{#if hours === 'always'}
							<input type="hidden" name="open" value={formatTime(ALL_DAY.open)} />
							<input type="hidden" name="close" value={formatTime(ALL_DAY.close)} />
							<p class="text-ink-soft">
								The court can be booked at any time of day or night. The calendar opens at 7am and
								people can scroll up or down.
							</p>
						{:else}
							<div class="grid grid-cols-2 gap-3">
								<div class="flex flex-col gap-2">
									<Label for="s-open">Court opens</Label>
									<TimeSelect id="s-open" name="open" bind:value={openTime} options={openOptions} />
								</div>
								<div class="flex flex-col gap-2">
									<Label for="s-close">Court closes</Label>
									<TimeSelect
										id="s-close"
										name="close"
										bind:value={closeTime}
										options={closeOptions}
									/>
								</div>
							</div>
						{/if}
					</div>

					<div class="flex flex-col gap-2">
						<Label for="s-title">Website name</Label>
						<Input id="s-title" name="title" value={data.settings.title} maxlength={80} required />
					</div>

					<Button type="submit" size="lg" class="self-start" disabled={saving}>
						{saving ? 'Saving…' : 'Save settings'}
					</Button>
				</form>
			</Tabs.Content>

			<!-- Activity -->
			<Tabs.Content value="activity" class="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-7">
				<div>
					<h2 class="text-lg font-semibold tracking-[-0.01em]">Recent activity</h2>
					<p class="text-base text-ink-soft">
						Every booking, cancellation and change, newest first.
					</p>
				</div>
				{#if data.log.length === 0}
					<p class="py-6 text-center text-base text-ink-soft">Nothing yet.</p>
				{:else}
					<ol class="flex flex-col divide-y divide-line">
						{#each data.log as entry (entry.id)}
							<li class="flex flex-wrap gap-x-4 gap-y-0.5 py-3">
								<span class="w-44 shrink-0 text-ink-soft tabular-nums">{when(entry.at)}</span>
								<span class="font-semibold">{entry.action}</span>
								<span class="min-w-0 flex-1 text-ink-soft">{entry.detail}</span>
							</li>
						{/each}
					</ol>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	</div>

	<AdminBookingDialog
		bind:open={bookOpen}
		date={bookDate}
		start={bookStart}
		openTime={data.settings.open}
		closeTime={data.settings.close}
		weekly={bookWeekly}
		{editing}
		scope={editScope}
	/>
	<AdminSlotDialog bind:open={slotOpen} slot={selected} onedit={edit} />
{/if}
