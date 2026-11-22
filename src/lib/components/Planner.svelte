<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import Calendar from './Calendar.svelte';
	import MonthView from './MonthView.svelte';
	import {
		addDays,
		addMonths,
		dayOfMonth,
		formatLong,
		formatMonth,
		formatWeekRange,
		isSameMonth,
		monthGrid,
		nowUK,
		shortDay,
		weekDates,
		type ISODate
	} from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';

	type View = 'day' | 'week' | 'month';

	interface Props {
		/** Which view the server loaded bookings for. */
		view: View;
		/** The days whose bookings are in `slots`. */
		from: ISODate;
		to: ISODate;
		focus: ISODate;
		today: ISODate;
		nowMinutes: number;
		slots: Slot[];
		open: number;
		close: number;
		mine?: Set<string>;
		allowPast?: boolean;
		onpick: (date: ISODate, start: number) => void;
		onopen: (slot: Slot) => void;
		/** Buttons beside the calendar. Gets the day currently on screen. */
		actions?: Snippet<[ISODate]>;
		/** Told whenever the day on screen changes, e.g. so a "Book" button elsewhere can use it. */
		ondaychange?: (day: ISODate) => void;
		/** On wide screens, fill the parent's height rather than growing with the day. */
		fit?: boolean;
	}

	let {
		view,
		from,
		to,
		focus,
		today,
		nowMinutes,
		slots,
		open,
		close,
		mine,
		allowPast = false,
		onpick,
		onopen,
		actions,
		ondaychange,
		fit = false
	}: Props = $props();

	// The selected day. Moving within the loaded days is instant; anything else asks the server.
	let current = $derived(focus);

	const wide = new MediaQuery('min-width: 768px', false);
	const oneDay = $derived(view === 'day' || (view === 'week' && !wide.current));
	/** What's actually on screen: phones show a single day instead of a week. */
	const shown = $derived<View>(view === 'month' ? 'month' : oneDay ? 'day' : 'week');

	const days = $derived(weekDates(current));
	const grid = $derived(monthGrid(current));

	function load(d: ISODate, v: View) {
		const url = new URL(page.url.href);
		url.searchParams.set('date', d);
		url.searchParams.set('view', v);
		goto(url, { reset: false });
	}

	/** Switch view from the toggle, and remember it for next time. */
	function setView(v: View) {
		document.cookie = `tb_view=${v}; path=/; max-age=31536000; samesite=lax`;
		load(current, v);
	}

	function go(d: ISODate) {
		current = d;
		if (d < from || d > to || (view === 'month' && !isSameMonth(d, focus))) load(d, view);
	}

	function move(dir: 1 | -1) {
		if (shown === 'month') go(addMonths(current, dir));
		else go(addDays(current, dir * (shown === 'day' ? 1 : 7)));
	}
	const unit = $derived(shown === 'month' ? 'month' : shown);

	$effect(() => ondaychange?.(current));

	// Keep the clock ticking and pick up other people's bookings now and then.
	let clock = $state<{ date: ISODate; minutes: number } | null>(null);
	$effect(() => {
		const tick = () => (clock = nowUK());
		tick();
		const t = setInterval(tick, 30_000);
		const refresh = setInterval(() => invalidate('app:slots'), 120_000);
		const onVisible = () => document.visibilityState === 'visible' && invalidate('app:slots');
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			clearInterval(t);
			clearInterval(refresh);
			document.removeEventListener('visibilitychange', onVisible);
		};
	});
	const liveToday = $derived(clock?.date ?? today);
	const liveMinutes = $derived(clock?.minutes ?? nowMinutes);

	const countFor = (d: ISODate) => slots.filter((s) => s.date === d && s.kind === 'booking').length;
	const showingToday = $derived(
		shown === 'month'
			? isSameMonth(current, liveToday)
			: shown === 'day'
				? current === liveToday
				: days.includes(liveToday)
	);
	const heading = $derived(
		shown === 'month'
			? formatMonth(current)
			: shown === 'day'
				? formatLong(current)
				: formatWeekRange(days[0])
	);
</script>

<section
	class={['flex flex-col gap-4', fit && 'md:min-h-0 md:flex-1 md:gap-3']}
	aria-label="Court calendar"
>
	<!-- Toolbar -->
	<div class="flex shrink-0 flex-wrap items-center gap-3">
		<h2
			class="min-w-0 flex-1 text-2xl font-semibold tracking-[-0.03em] max-md:order-first max-md:w-full max-md:flex-none"
			aria-live="polite"
		>
			{heading}
		</h2>

		<div class="flex items-center gap-2 max-md:flex-1">
			<Button variant="outline" size="icon" onclick={() => move(-1)} aria-label="Previous {unit}">
				<ChevronLeft />
			</Button>
			<Button
				variant="outline"
				class="max-md:flex-1"
				onclick={() => go(liveToday)}
				disabled={showingToday}
			>
				Today
			</Button>
			<Button variant="outline" size="icon" onclick={() => move(1)} aria-label="Next {unit}">
				<ChevronRight />
			</Button>
		</div>

		<!-- Phones get Day and Month; a week doesn't fit. -->
		<div
			class="flex h-11 rounded-full border border-line bg-surface p-1"
			role="group"
			aria-label="Show"
		>
			{#each ['day', 'week', 'month'] as const as v (v)}
				<button
					type="button"
					class={[
						'h-full rounded-full px-4 text-[0.9375rem] font-medium transition-colors max-sm:px-3',
						shown === v ? 'bg-ink text-on-ink' : 'text-ink-soft hover:text-ink',
						v === 'week' && 'max-md:hidden'
					]}
					aria-pressed={shown === v}
					onclick={() => shown !== v && setView(v)}
				>
					{v === 'day' ? 'Day' : v === 'week' ? 'Week' : 'Month'}
				</button>
			{/each}
		</div>
		{#if actions}
			<div class="flex items-center gap-2 max-md:w-full">{@render actions(current)}</div>
		{/if}
	</div>

	<!-- Day picker for phones -->
	{#if shown === 'day'}
		<div
			class="sticky top-(--nav-offset) z-30 -mx-4 grid grid-cols-7 gap-1.5 bg-page/95 px-4 py-2 backdrop-blur-xl md:hidden"
			role="group"
			aria-label="Choose a day"
		>
			{#each days as d (d)}
				{@const n = countFor(d)}
				<button
					type="button"
					class={[
						'flex flex-col items-center gap-1 rounded-2xl border py-2 transition-colors',
						d === current ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface text-ink'
					]}
					aria-pressed={d === current}
					aria-label="{formatLong(d)}{n ? `, ${n} booking${n === 1 ? '' : 's'}` : ''}"
					onclick={() => go(d)}
				>
					<span class="text-[0.6875rem] font-medium tracking-[0.04em] uppercase opacity-60">
						{shortDay(d).slice(0, 3)}
					</span>
					<span
						class={[
							'grid size-7 place-items-center rounded-full text-base leading-none font-semibold tabular-nums',
							d === liveToday && 'bg-ball text-on-ball'
						]}
					>
						{dayOfMonth(d)}
					</span>
					<span class="flex h-1 gap-0.5" aria-hidden="true">
						{#each Array(Math.min(n, 4)) as _, i (i)}
							<span class={['size-1 rounded-full', d === current ? 'bg-ball' : 'bg-ball-ink']}
							></span>
						{/each}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if shown === 'month'}
		<MonthView
			days={grid}
			focus={current}
			{slots}
			today={liveToday}
			{mine}
			{fit}
			onselectday={(d) => {
				current = d;
				load(d, 'day');
			}}
			{onopen}
		/>
	{:else}
		<Calendar
			{days}
			focus={current}
			view={oneDay ? 'day' : 'week'}
			{slots}
			{open}
			{close}
			today={liveToday}
			nowMinutes={liveMinutes}
			{mine}
			{allowPast}
			{onpick}
			{onopen}
			{fit}
		/>
	{/if}

	<!-- Key -->
	<ul class="flex shrink-0 flex-wrap gap-x-5 gap-y-2 px-1 text-sm text-ink-soft">
		<li class="flex items-center gap-2">
			<span class="size-2.5 rounded-full bg-(--slot-booking-edge)"></span>
			Booked
		</li>
		<li class="flex items-center gap-2">
			<span class="size-2.5 rounded-full bg-(--slot-regular-edge)"></span>
			Regular weekly booking
		</li>
		<li class="flex items-center gap-2">
			<span class="hatch size-2.5 rounded-full bg-(--slot-block-edge)"></span>
			Court not available
		</li>
		{#if mine}
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-full ring-2 ring-ink"></span>
				Booked on this device
			</li>
		{/if}
	</ul>
</section>
