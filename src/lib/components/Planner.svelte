<script lang="ts">
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '#lib/components/ui/button/index.js';
	import Calendar from './Calendar.svelte';
	import {
		addDays,
		dayOfMonth,
		formatLong,
		formatWeekRange,
		nowUK,
		shortDay,
		weekDates,
		type ISODate
	} from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';

	interface Props {
		weekStart: ISODate;
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
	}

	let {
		weekStart,
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
		ondaychange
	}: Props = $props();

	const VIEW_KEY = 'tb:view';
	let view = $state<'week' | 'day'>('week');
	$effect(() => {
		try {
			if (localStorage.getItem(VIEW_KEY) === 'day') view = 'day';
		} catch {}
	});
	function setView(v: 'week' | 'day') {
		view = v;
		try {
			localStorage.setItem(VIEW_KEY, v);
		} catch {}
	}

	const wide = new MediaQuery('min-width: 768px', false);
	const oneDay = $derived(!wide.current || view === 'day');

	// The selected day. Moving within the week happens instantly; other weeks are loaded from the server.
	let current = $derived(focus);
	const days = $derived(weekDates(weekStart));

	function go(d: ISODate) {
		current = d;
		if (d < weekStart || d > addDays(weekStart, 6)) {
			const url = new URL(page.url.href);
			url.searchParams.set('date', d);
			goto(url, { reset: false });
		}
	}
	const step = $derived(oneDay ? 1 : 7);
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
	const showingToday = $derived(oneDay ? current === liveToday : days.includes(liveToday));
</script>

<section class="flex flex-col gap-4" aria-label="Court calendar">
	<!-- Toolbar -->
	<div class="flex flex-wrap items-center gap-3">
		<h2
			class="min-w-0 flex-1 text-2xl font-semibold tracking-[-0.03em] max-md:order-first max-md:w-full max-md:flex-none"
			aria-live="polite"
		>
			<span class="md:hidden">{formatLong(current)}</span>
			<span class="max-md:hidden">
				{view === 'day' ? formatLong(current) : formatWeekRange(weekStart)}
			</span>
		</h2>

		<div class="flex items-center gap-2 max-md:w-full">
			<Button
				variant="outline"
				size="icon"
				onclick={() => go(addDays(current, -step))}
				aria-label={oneDay ? 'Previous day' : 'Previous week'}
			>
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
			<Button
				variant="outline"
				size="icon"
				onclick={() => go(addDays(current, step))}
				aria-label={oneDay ? 'Next day' : 'Next week'}
			>
				<ChevronRight />
			</Button>
		</div>

		<div
			class="flex h-11 rounded-full border border-line bg-surface p-1 max-md:hidden"
			role="group"
			aria-label="Show"
		>
			{#each ['day', 'week'] as const as v (v)}
				<button
					type="button"
					class={[
						'h-full rounded-full px-4 text-[0.9375rem] font-medium transition-colors',
						view === v ? 'bg-ink text-on-ink' : 'text-ink-soft hover:text-ink'
					]}
					aria-pressed={view === v}
					onclick={() => setView(v)}
				>
					{v === 'day' ? 'Day' : 'Week'}
				</button>
			{/each}
		</div>
		{#if actions}
			<div class="flex items-center gap-2 max-md:w-full">{@render actions(current)}</div>
		{/if}
	</div>

	<!-- Day picker for phones -->
	<div
		class="sticky top-[4.75rem] z-30 -mx-4 grid grid-cols-7 gap-1.5 bg-page/80 px-4 py-2 backdrop-blur-xl md:hidden"
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
						<span class={['size-1 rounded-full', d === current ? 'bg-ball' : 'bg-ball-ink']}></span>
					{/each}
				</span>
			</button>
		{/each}
	</div>

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
	/>

	<!-- Key -->
	<ul class="flex flex-wrap gap-x-5 gap-y-2 px-1 text-sm text-ink-soft">
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
