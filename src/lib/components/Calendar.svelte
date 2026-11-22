<script lang="ts">
	import { untrack } from 'svelte';
	import Repeat from '@lucide/svelte/icons/repeat-2';
	import Lock from '@lucide/svelte/icons/lock';
	import Plus from '@lucide/svelte/icons/plus';
	import {
		dayName,
		dayOfMonth,
		formatLong,
		formatRange,
		formatTime,
		shortDay,
		type ISODate
	} from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';

	interface Props {
		days: ISODate[];
		focus: ISODate;
		/** 'week' shows seven columns on wide screens; phones always show one day. */
		view: 'week' | 'day';
		slots: Slot[];
		open: number;
		close: number;
		today: ISODate;
		nowMinutes: number;
		mine?: Set<string>;
		/** The post office can book times that have already passed. */
		allowPast?: boolean;
		onpick: (date: ISODate, start: number) => void;
		onopen: (slot: Slot) => void;
	}

	let {
		days,
		focus,
		view,
		slots,
		open,
		close,
		today,
		nowMinutes,
		mine = new Set(),
		allowPast = false,
		onpick,
		onopen
	}: Props = $props();

	// Show whole hours, and stretch the range if anything was booked outside opening hours.
	const rangeStart = $derived(Math.floor(Math.min(open, ...slots.map((s) => s.start)) / 60) * 60);
	const rangeEnd = $derived(Math.ceil(Math.max(close, ...slots.map((s) => s.end)) / 60) * 60);
	const hours = $derived(
		Array.from({ length: (rangeEnd - rangeStart) / 60 }, (_, i) => rangeStart + i * 60)
	);
	// Long days (e.g. open all the time) scroll inside the calendar instead of the whole page,
	// starting at 7am, or around now if today is on screen.
	const long = $derived(rangeEnd - rangeStart > 16 * 60);
	let scroller = $state<HTMLElement>();
	$effect(() => {
		if (!long || !scroller) return;
		const el = scroller;
		untrack(() => {
			const showingNow = days.includes(today) && nowMinutes > 8 * 60;
			const target = Math.max(rangeStart, showingNow ? nowMinutes - 60 : 7 * 60);
			const hourPx = el.scrollHeight / ((rangeEnd - rangeStart) / 60);
			// A little less, so the hour label at the top isn't cut in half.
			el.scrollTop = ((target - rangeStart) / 60) * hourPx - 16;
		});
	});

	const halves = $derived(
		Array.from({ length: (rangeEnd - rangeStart) / 30 }, (_, i) => rangeStart + i * 30)
	);

	const byDay = $derived.by(() => {
		const map = new Map<ISODate, Slot[]>();
		for (const s of slots) map.set(s.date, [...(map.get(s.date) ?? []), s]);
		return map;
	});

	const top = (m: number) => `calc(${(m - rangeStart) / 60} * var(--hour))`;
	const height = (s: Slot) => `calc(${(s.end - s.start) / 60} * var(--hour) - 3px)`;

	function isPast(date: ISODate, m: number) {
		if (allowPast) return false;
		return date < today || (date === today && m + 30 <= nowMinutes);
	}
	function isOpen(m: number) {
		return m >= open && m < close;
	}

	/** Hidden columns: in day view everything but the chosen day; on phones too. */
	function columnClass(d: ISODate) {
		if (d === focus) return '';
		return view === 'day' ? 'hidden' : 'max-md:hidden';
	}

	function slotTone(s: Slot) {
		if (s.kind === 'block') return 'tone-block hatch';
		return s.recurring ? 'tone-regular' : 'tone-booking';
	}
</script>

<div class="frost overflow-clip rounded-3xl" style="--hour: 4.5rem; --gutter: 4.25rem;">
	<!-- Day headings -->
	<div
		class={[
			'sticky top-0 z-30 flex border-b border-white bg-white/80 backdrop-blur-xl max-md:hidden',
			// Leave room for the grid's scrollbar so the columns line up.
			long && '[scrollbar-gutter:stable] overflow-y-hidden'
		]}
		role="presentation"
	>
		<div class="w-(--gutter) shrink-0"></div>
		{#each days as d (d)}
			<div class="min-w-0 flex-1 border-l border-ice-200 px-2 py-3 text-center {columnClass(d)}">
				<div class="text-sm font-bold tracking-wide text-ink-soft uppercase">
					<span class="lg:hidden">{shortDay(d)}</span>
					<span class="max-lg:hidden">{dayName(d)}</span>
				</div>
				<div
					class={[
						'mx-auto mt-1 grid size-11 place-items-center rounded-full text-2xl font-bold tabular-nums',
						d === today
							? 'bg-ball text-ink shadow-[0_4px_12px_-4px_oklch(0.6_0.15_125/0.7)]'
							: 'text-ink'
					]}
				>
					{dayOfMonth(d)}
				</div>
			</div>
		{/each}
	</div>

	<!-- Time grid -->
	<div
		bind:this={scroller}
		class={[
			// items-start: columns are as tall as the whole day, not just the visible part.
			'relative flex items-start',
			long &&
				'max-h-[min(46rem,72dvh)] [scrollbar-gutter:stable] overflow-y-auto overscroll-contain'
		]}
	>
		<div class="w-(--gutter) shrink-0" aria-hidden="true">
			{#each hours as h (h)}
				<div class="relative h-(--hour)">
					<span
						class={[
							'absolute right-3 text-[0.95rem] font-semibold text-ink-soft tabular-nums',
							h === rangeStart ? 'top-1.5' : '-top-[0.7em]'
						]}
					>
						{formatTime(h)}
					</span>
				</div>
			{/each}
		</div>

		{#each days as d (d)}
			<div class="relative min-w-0 flex-1 border-l border-ice-200 {columnClass(d)}">
				{#each halves as m (m)}
					{@const past = isPast(d, m)}
					{@const available = isOpen(m)}
					<button
						type="button"
						class={[
							'group/cell flex w-full items-center px-2 text-left text-[0.95rem] font-semibold transition-colors',
							'h-[calc(var(--hour)/2)] border-t',
							m % 60 === 0 ? 'border-ice-200' : 'border-dashed border-ice-200/70',
							past || !available
								? 'bg-ink/[0.035]'
								: 'hover:bg-white/80 focus-visible:bg-white/80 focus-visible:outline-offset-[-3px]'
						]}
						disabled={past || !available}
						onclick={() => onpick(d, m)}
						aria-label="Book {formatLong(d)} at {formatTime(m)}"
					>
						{#if !past && available}
							<span
								class="flex items-center gap-1 text-glacier opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100"
							>
								<Plus class="size-4" />
								{formatTime(m)}
							</span>
						{/if}
					</button>
				{/each}

				{#each byDay.get(d) ?? [] as s (s.id)}
					{@const short = s.end - s.start <= 30}
					{@const yours = mine.has(s.id)}
					<button
						type="button"
						class={[
							'slot absolute inset-x-1 z-10 flex min-w-0 flex-col overflow-hidden rounded-xl border-l-4 px-2.5 text-left',
							'transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_10px_24px_-12px_oklch(0.3_0.08_245/0.6)]',
							short ? 'justify-center py-0.5' : 'py-1.5',
							slotTone(s),
							yours && 'ring-3 ring-ball ring-offset-1 ring-offset-white/60'
						]}
						style:top={top(s.start)}
						style:height={height(s)}
						onclick={() => onopen(s)}
						aria-label="{s.kind === 'block'
							? 'Court unavailable'
							: 'Booked by ' + s.name}, {formatLong(d)}, {formatRange(s.start, s.end)}"
					>
						{#if short}
							<span class="flex min-w-0 items-center gap-1.5 text-[0.95rem] leading-tight">
								<span class="shrink-0 font-semibold tabular-nums opacity-75">
									{formatTime(s.start)}
								</span>
								<span class="truncate font-bold">{s.name}</span>
							</span>
						{:else}
							<span class="flex min-w-0 items-center gap-1.5 text-base leading-snug font-bold">
								{#if s.kind === 'block'}<Lock class="size-4 shrink-0" />{/if}
								<span class="truncate">{s.name}</span>
								{#if s.recurring && s.kind !== 'block'}<Repeat
										class="size-4 shrink-0 opacity-70"
									/>{/if}
							</span>
							<span class="text-[0.9rem] leading-snug font-semibold tabular-nums opacity-75">
								{formatRange(s.start, s.end)}
							</span>
							{#if yours && s.end - s.start >= 90}
								<span
									class="mt-auto mb-0.5 self-start rounded-full bg-ball px-2 py-0.5 text-xs font-bold tracking-wide text-ink uppercase"
								>
									Your booking
								</span>
							{/if}
						{/if}
					</button>
				{/each}

				{#if d === today && nowMinutes >= rangeStart && nowMinutes <= rangeEnd}
					<div
						class="pointer-events-none absolute inset-x-0 z-20 flex items-center"
						style:top={top(nowMinutes)}
						aria-hidden="true"
					>
						<span class="-ml-1.5 size-3 rounded-full bg-destructive"></span>
						<span class="h-0.5 flex-1 bg-destructive/80"></span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.slot {
		color: var(--ink);
	}
	.tone-booking {
		background-color: var(--slot-booking);
		border-color: var(--slot-booking-edge);
	}
	.tone-regular {
		background-color: var(--slot-regular);
		border-color: var(--slot-regular-edge);
	}
	.tone-block {
		background-color: var(--slot-block);
		border-color: var(--slot-block-edge);
		color: var(--ink-soft);
	}
</style>
