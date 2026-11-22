<script lang="ts">
	import Lock from '@lucide/svelte/icons/lock';
	import {
		DAY_NAMES,
		dayOfMonth,
		formatLong,
		formatRange,
		formatTime,
		isSameMonth,
		type ISODate
	} from '#lib/dates.js';
	import type { Slot } from '#lib/types.js';

	interface Props {
		/** The 42 days of the month grid, Monday first. */
		days: ISODate[];
		/** A day in the month being shown. */
		focus: ISODate;
		slots: Slot[];
		today: ISODate;
		mine?: Set<string>;
		/** On wide screens, fill the parent's height instead of growing with the content. */
		fit?: boolean;
		/** A day was tapped: show it in day view. */
		onselectday: (date: ISODate) => void;
		onopen: (slot: Slot) => void;
	}

	let {
		days,
		focus,
		slots,
		today,
		mine = new Set(),
		fit = false,
		onselectday,
		onopen
	}: Props = $props();

	// How many lines fit in a day depends on the row height, which depends on the window.
	// Each booking line is 1.25rem tall with a 0.25rem gap; the day number and padding take 2.25rem.
	let gridHeight = $state(0);
	const rem = 16;
	const lines = $derived.by(() => {
		if (!gridHeight) return 3;
		const row = gridHeight / 6;
		return Math.max(1, Math.floor((row - 2.25 * rem + 0.25 * rem) / (1.5 * rem)));
	});
	/** Bookings to show for a day: all of them if they fit, otherwise room for "+N more" too. */
	const visible = (list: Slot[]) => (list.length <= lines ? list : list.slice(0, lines - 1));

	const byDay = $derived.by(() => {
		const map = new Map<ISODate, Slot[]>();
		for (const s of slots) map.set(s.date, [...(map.get(s.date) ?? []), s]);
		for (const list of map.values()) list.sort((a, b) => a.start - b.start);
		return map;
	});

	function tone(s: Slot) {
		if (s.kind === 'block') return 'tone-block hatch';
		return s.recurring ? 'tone-regular' : 'tone-booking';
	}

	function describeDay(d: ISODate, list: Slot[]) {
		const n = list.filter((s) => s.kind === 'booking').length;
		return `${formatLong(d)}${n ? `, ${n} booking${n === 1 ? '' : 's'}` : ', no bookings'}`;
	}
</script>

<div class={['panel flex flex-col overflow-clip rounded-3xl', fit && 'md:min-h-0 md:flex-1']}>
	<!-- Weekday names -->
	<div class="grid shrink-0 grid-cols-7 border-b border-line">
		{#each DAY_NAMES as name, i (name)}
			<div
				class={[
					'py-2.5 text-center text-xs font-medium tracking-[0.06em] text-ink-soft uppercase',
					i > 0 && 'border-l border-grid'
				]}
			>
				<span class="sm:hidden">{name.slice(0, 1)}</span>
				<span class="max-sm:hidden lg:hidden">{name.slice(0, 3)}</span>
				<span class="max-lg:hidden">{name}</span>
			</div>
		{/each}
	</div>

	<!-- Six weeks of days -->
	<div
		class={[
			'grid grid-cols-7 grid-rows-[repeat(6,minmax(4rem,auto))]',
			// Filling the screen: six equal rows. Otherwise each row is at least 7.5rem tall.
			fit ? 'md:min-h-0 md:flex-1 md:grid-rows-6' : 'md:grid-rows-[repeat(6,minmax(7.5rem,auto))]'
		]}
		bind:clientHeight={gridHeight}
	>
		{#each days as d, i (d)}
			{@const list = byDay.get(d) ?? []}
			{@const inMonth = isSameMonth(d, focus)}
			{@const shownList = visible(list)}
			{@const extra = list.length - shownList.length}
			<div
				class={[
					'relative flex min-h-0 min-w-0 flex-col gap-1 overflow-hidden p-1',
					i % 7 > 0 && 'border-l border-grid',
					i >= 7 && 'border-t border-grid',
					!inMonth && 'bg-ink/[0.025]'
				]}
			>
				<!-- The whole day is a button that opens it in day view; bookings sit on top. -->
				<button
					type="button"
					class="absolute inset-0 transition-colors hover:bg-ball/10 focus-visible:bg-ball/10 focus-visible:outline-offset-[-2px]"
					onclick={() => onselectday(d)}
					aria-label="Show {describeDay(d, list)}"
				></button>

				<span
					class={[
						'pointer-events-none relative grid size-6 shrink-0 place-items-center self-center rounded-full text-[0.8125rem] font-semibold tabular-nums md:ml-0.5 md:self-start',
						d === today ? 'bg-ball text-on-ball' : inMonth ? 'text-ink' : 'text-ink-soft/50'
					]}
				>
					{dayOfMonth(d)}
				</span>

				<!-- Phones: dots, one per booking (up to four). -->
				{#if list.length}
					<span class="pointer-events-none relative flex justify-center gap-0.5 md:hidden">
						{#each list.slice(0, 4) as s (s.id)}
							<span
								class={[
									'size-1.5 rounded-full',
									s.kind === 'block'
										? 'bg-(--slot-block-edge)'
										: s.recurring
											? 'bg-(--slot-regular-edge)'
											: 'bg-ball-ink'
								]}
							></span>
						{/each}
					</span>
				{/if}

				<!-- Wider screens: the bookings themselves. -->
				<!-- The list ignores clicks so empty space still opens the day; the chips themselves don't. -->
				<ul class="pointer-events-none relative flex min-h-0 flex-col gap-1 max-md:hidden">
					{#each shownList as s (s.id)}
						<li class="pointer-events-auto min-w-0">
							<button
								type="button"
								class={[
									'flex h-5 w-full min-w-0 items-center gap-1.5 rounded-lg px-1.5 text-left text-xs leading-none transition-[filter] hover:brightness-[0.97] dark:hover:brightness-125',
									tone(s),
									mine.has(s.ref) && 'ring-2 ring-ink ring-offset-1 ring-offset-surface'
								]}
								onclick={() => onopen(s)}
								aria-label="{s.kind === 'block'
									? 'Court unavailable'
									: 'Booked by ' + s.name}, {formatLong(d)}, {formatRange(s.start, s.end)}"
							>
								{#if s.kind === 'block'}<Lock class="size-3 shrink-0" />{/if}
								<span class="shrink-0 text-ink-soft tabular-nums">{formatTime(s.start)}</span>
								<span class="truncate font-semibold">{s.name}</span>
							</button>
						</li>
					{/each}
					{#if extra > 0}
						<li class="pointer-events-auto self-start">
							<button
								type="button"
								class="flex h-5 items-center rounded-md px-1.5 text-xs font-medium text-ink-soft hover:text-ink"
								onclick={() => onselectday(d)}
							>
								{shownList.length ? `+${extra} more` : `${extra} booking${extra === 1 ? '' : 's'}`}
							</button>
						</li>
					{/if}
				</ul>
			</div>
		{/each}
	</div>
</div>
