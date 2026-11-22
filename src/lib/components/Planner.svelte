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
		actions
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
		<div class="flex items-center gap-2 max-md:w-full">
			<Button
				variant="outline"
				size="icon"
				onclick={() => go(addDays(current, -step))}
				aria-label={oneDay ? 'Previous day' : 'Previous week'}
			>
				<ChevronLeft class="size-6" />
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
				<ChevronRight class="size-6" />
			</Button>
		</div>

		<h2
			class="min-w-0 flex-1 text-2xl font-bold tracking-[-0.01em] max-md:order-first max-md:w-full max-md:flex-none"
			aria-live="polite"
		>
			<span class="md:hidden">{formatLong(current)}</span>
			<span class="max-md:hidden">
				{view === 'day' ? formatLong(current) : formatWeekRange(weekStart)}
			</span>
		</h2>

		<div class="flex items-center gap-3 max-md:w-full">
			<div class="flex rounded-xl bg-ice-200/70 p-1 max-md:hidden" role="group" aria-label="Show">
				{#each ['day', 'week'] as const as v (v)}
					<button
						type="button"
						class={[
							'h-10 rounded-lg px-4 font-bold transition-all',
							view === v ? 'bg-white text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
						]}
						aria-pressed={view === v}
						onclick={() => setView(v)}
					>
						{v === 'day' ? 'Day' : 'Week'}
					</button>
				{/each}
			</div>
			{@render actions?.(current)}
		</div>
	</div>

	<!-- Day picker for phones -->
	<div
		class="sticky top-0 z-40 -mx-4 grid grid-cols-7 gap-1.5 bg-ice-100/75 px-4 py-2 backdrop-blur-xl md:hidden"
		role="group"
		aria-label="Choose a day"
	>
		{#each days as d (d)}
			{@const n = countFor(d)}
			<button
				type="button"
				class={[
					'flex flex-col items-center gap-0.5 rounded-2xl py-2 transition-all',
					d === current
						? 'bg-ink text-white shadow-[0_8px_18px_-8px_oklch(0.27_0.045_250/0.7)]'
						: 'frost text-ink'
				]}
				aria-pressed={d === current}
				aria-label="{formatLong(d)}{n ? `, ${n} booking${n === 1 ? '' : 's'}` : ''}"
				onclick={() => go(d)}
			>
				<span class="text-xs font-bold tracking-wide uppercase opacity-80">
					{shortDay(d).slice(0, 3)}
				</span>
				<span
					class={[
						'text-xl leading-none font-bold tabular-nums',
						d === liveToday && d !== current && 'rounded-full bg-ball px-1.5 py-0.5'
					]}
				>
					{dayOfMonth(d)}
				</span>
				<span class="flex h-1.5 gap-0.5" aria-hidden="true">
					{#each Array(Math.min(n, 4)) as _, i (i)}
						<span class={['size-1.5 rounded-full', d === current ? 'bg-ball' : 'bg-glacier/70']}
						></span>
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
	<ul class="flex flex-wrap gap-x-5 gap-y-2 px-1 text-[0.95rem] font-semibold text-ink-soft">
		<li class="flex items-center gap-2">
			<span class="h-4 w-6 rounded-md border-l-4 border-(--slot-booking-edge) bg-(--slot-booking)"
			></span>
			Booked
		</li>
		<li class="flex items-center gap-2">
			<span class="h-4 w-6 rounded-md border-l-4 border-(--slot-regular-edge) bg-(--slot-regular)"
			></span>
			Regular weekly booking
		</li>
		<li class="flex items-center gap-2">
			<span class="hatch h-4 w-6 rounded-md border-l-4 border-(--slot-block-edge) bg-(--slot-block)"
			></span>
			Court not available
		</li>
		{#if mine}
			<li class="flex items-center gap-2">
				<span class="h-4 w-6 rounded-md bg-(--slot-booking) ring-3 ring-ball"></span>
				Booked on this device
			</li>
		{/if}
	</ul>
</section>
