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
		/**
		 * On wide screens, fill the height the parent gives it instead of growing to fit
		 * the day. The day shrinks to fit, and only scrolls inside if hours would get too small.
		 */
		fit?: boolean;
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
		onopen,
		fit = false
	}: Props = $props();

	// Show whole hours, and stretch the range if anything was booked outside opening hours.
	const rangeStart = $derived(Math.floor(Math.min(open, ...slots.map((s) => s.start)) / 60) * 60);
	const rangeEnd = $derived(Math.ceil(Math.max(close, ...slots.map((s) => s.end)) / 60) * 60);
	const hours = $derived(
		Array.from({ length: (rangeEnd - rangeStart) / 60 }, (_, i) => rangeStart + i * 60)
	);
	// Long days (e.g. open all the time) scroll inside the calendar instead of the whole page.
	const long = $derived(rangeEnd - rangeStart > 16 * 60);
	// When the calendar scrolls inside itself, start at 7am, or around now if today is on screen.
	let scroller = $state<HTMLElement>();
	$effect(() => {
		if (!scroller) return;
		const el = scroller;
		untrack(() => {
			if (el.scrollHeight <= el.clientHeight + 1) return;
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

	// Positions are a share of the day, so the grid can be any height.
	const span = $derived(rangeEnd - rangeStart);
	const top = (m: number) => `${((m - rangeStart) / span) * 100}%`;
	const height = (s: Slot) => `calc(${((s.end - s.start) / span) * 100}% - 3px)`;

	function isPast(date: ISODate, m: number) {
		if (allowPast) return false;
		return date < today || (date === today && m + 30 <= nowMinutes);
	}
	function isOpen(m: number) {
		return m >= open && m < close;
	}

	/** In day view, only the chosen day's column is shown. */
	function columnClass(d: ISODate) {
		return view === 'day' && d !== focus ? 'hidden' : '';
	}

	function slotTone(s: Slot) {
		if (s.kind === 'block') return 'tone-block hatch';
		return s.recurring ? 'tone-regular' : 'tone-booking';
	}
</script>

<div
	class={[
		'panel overflow-clip rounded-3xl [--gutter:2.25rem] md:[--gutter:4rem]',
		fit && 'md:flex md:min-h-0 md:flex-1 md:flex-col'
	]}
	style="--hour: 4.25rem; --min-hour: 2.2rem; --hours: {hours.length};"
>
	<!-- Day headings -->
	<div
		class={[
			'z-20 flex shrink-0 border-b border-line bg-surface',
			// Phones in day view have the day picker instead.
			view === 'day' && 'max-md:hidden',
			fit ? 'max-md:sticky max-md:top-(--nav-offset)' : 'sticky top-(--nav-offset)',
			// Leave room for the grid's scrollbar so the columns line up.
			(fit || long) && '[scrollbar-gutter:stable] overflow-y-hidden'
		]}
		role="presentation"
	>
		<div class="w-(--gutter) shrink-0"></div>
		{#each days as d (d)}
			<div
				class="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-l border-grid px-0.5 py-1.5 md:flex-row md:gap-2 md:px-2 md:py-2 {columnClass(
					d
				)}"
			>
				<span
					class="text-[0.625rem] font-medium tracking-[0.04em] text-ink-soft uppercase md:text-xs md:tracking-[0.06em]"
				>
					<span class="lg:hidden">{shortDay(d)}</span>
					<span class="max-lg:hidden">{dayName(d)}</span>
				</span>
				<span
					class={[
						'grid size-7 place-items-center rounded-full text-sm font-semibold tracking-[-0.01em] tabular-nums md:size-8 md:text-base',
						d === today ? 'bg-ball text-on-ball' : 'text-ink'
					]}
				>
					{dayOfMonth(d)}
				</span>
			</div>
		{/each}
	</div>

	<!-- Time grid -->
	<div
		bind:this={scroller}
		data-cal-scroller
		class={[
			// Top padding leaves room for the first hour's label, centred on its line like the rest.
			'relative overscroll-contain pt-2.5',
			fit && 'md:min-h-0 md:flex-1 md:[scrollbar-gutter:stable] md:overflow-y-auto',
			long &&
				(fit
					? 'max-md:max-h-[72dvh] max-md:overflow-y-auto'
					: 'max-h-[min(46rem,72dvh)] [scrollbar-gutter:stable] overflow-y-auto')
		]}
	>
		<!-- The whole day. When fitting, it fills the panel unless hours would get too short. -->
		<div
			class={[
				'relative flex h-[calc(var(--hours)*var(--hour))]',
				fit && 'md:h-[max(calc(100%-2px),calc(var(--hours)*var(--min-hour)))]'
			]}
		>
			<div class="flex w-(--gutter) shrink-0 flex-col" aria-hidden="true">
				{#each hours as h (h)}
					<div class="relative min-h-0 flex-1">
						<span
							class={[
								'absolute -top-[0.7em] right-1.5 text-[0.6875rem] font-medium text-ink-soft tabular-nums md:right-3 md:text-xs'
							]}
						>
							<!-- Phones: just the hour, to leave more room for the days. -->
							<span class="md:hidden">{formatTime(h).slice(0, 2)}</span>
							<span class="max-md:hidden">{formatTime(h)}</span>
						</span>
					</div>
				{/each}
			</div>

			{#each days as d (d)}
				<div
					class={[
						'relative flex min-w-0 flex-1 flex-col border-l border-grid',
						d === today && view === 'week' && 'bg-ball/[0.07]',
						columnClass(d)
					]}
				>
					{#each halves as m (m)}
						{@const past = isPast(d, m)}
						{@const available = isOpen(m)}
						<button
							type="button"
							class={[
								'group/cell flex w-full items-center px-2 text-left text-sm font-medium transition-colors',
								'min-h-0 flex-1 border-t',
								m % 60 === 0 ? 'border-grid' : 'border-dashed border-grid/50',
								past || !available
									? 'bg-ink/[0.03]'
									: 'hover:bg-ball/15 focus-visible:bg-ball/15 focus-visible:outline-offset-[-2px]'
							]}
							disabled={past || !available}
							onclick={() => onpick(d, m)}
							aria-label="Book {formatLong(d)} at {formatTime(m)}"
						>
							{#if !past && available}
								<span
									class="flex items-center gap-1 text-ball-ink opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-visible/cell:opacity-100"
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
								'slot absolute inset-x-0.5 z-10 flex min-w-0 flex-col overflow-hidden rounded-md text-left md:inset-x-1 md:rounded-xl md:px-2.5',
								// A week on a phone has very narrow columns, so keep the padding tight.
								view === 'week' ? 'max-md:px-[3px]' : 'max-md:px-2',
								'transition-[filter] hover:brightness-[0.97] dark:hover:brightness-125',
								short ? 'justify-center py-0' : 'py-1.5',
								slotTone(s),
								yours && 'ring-2 ring-ink ring-offset-2 ring-offset-surface'
							]}
							style:top={top(s.start)}
							style:height={height(s)}
							onclick={() => onopen(s)}
							aria-label="{s.kind === 'block'
								? 'Court unavailable'
								: 'Booked by ' + s.name}, {formatLong(d)}, {formatRange(s.start, s.end)}"
						>
							{#if short}
								<span class="flex min-w-0 items-center gap-1.5 text-[0.8125rem] leading-tight">
									<span class="slot-time shrink-0 font-medium text-ink-soft tabular-nums">
										{formatTime(s.start)}
									</span>
									<span class="truncate font-semibold">{s.name}</span>
								</span>
							{:else}
								<span
									class="slot-compact min-w-0 items-center gap-1.5 text-[0.8125rem] leading-tight"
								>
									<span class="slot-time shrink-0 font-medium text-ink-soft tabular-nums">
										{formatTime(s.start)}
									</span>
									<span class="truncate font-semibold">{s.name}</span>
								</span>
								<span
									class="slot-full flex min-w-0 items-center gap-1.5 text-sm leading-snug font-semibold"
								>
									{#if s.kind === 'block'}<Lock class="size-3.5 shrink-0" />{/if}
									<span class="slot-name truncate">{s.name}</span>
									{#if s.recurring && s.kind !== 'block'}<Repeat
											class="size-3.5 shrink-0 opacity-60"
										/>{/if}
								</span>
								<span
									class="slot-full slot-time truncate text-[0.8125rem] leading-snug font-medium text-ink-soft tabular-nums"
								>
									{formatRange(s.start, s.end)}
								</span>
								{#if yours && s.end - s.start >= 90}
									<span
										class="slot-full mt-auto mb-0.5 self-start text-[0.6875rem] font-semibold tracking-[0.06em] text-ball-ink uppercase"
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
							<span class="-ml-1 size-2 rounded-full bg-destructive"></span>
							<span class="h-px flex-1 bg-destructive"></span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.slot {
		color: var(--ink);
		/* Lets the booking's text adapt to how tall the block actually is. */
		container-type: size;
	}
	.slot-compact {
		display: none;
	}
	/* Too short for name and time on separate lines: show "10:00 Margaret Jones" on one. */
	@container (max-height: 2.6rem) {
		.slot-full {
			display: none;
		}
		.slot-compact {
			display: flex;
		}
	}
	/* Narrow columns (a week on a phone): just the name, smaller. Tap for the details. */
	@container (max-width: 5.5rem) {
		/* Let the name wrap onto as many lines as the booking has room for. */
		.slot-name {
			white-space: normal;
			/* Long names break with a hyphen ("Mar-garet") rather than being cut off. */
			hyphens: auto;
			overflow-wrap: anywhere;
			line-height: 1.2;
		}
		.slot-full {
			align-items: flex-start;
		}
		.slot-time,
		.slot :global(svg) {
			display: none !important;
		}
		.slot > span {
			font-size: 0.65rem;
			letter-spacing: -0.01em;
		}
	}
</style>
