<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { parseDate as toCalendarDate, type DateValue } from '@internationalized/date';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { Calendar } from '#lib/components/ui/calendar/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { addDays, formatLong, isValidDate, nowUK, type ISODate } from '#lib/dates.js';

	interface Props {
		id: string;
		name?: string;
		value: ISODate;
		min?: ISODate;
		max?: ISODate;
		required?: boolean;
		/** Shows "Today" and "Tomorrow" shortcuts under the calendar. */
		shortcuts?: boolean;
		placeholder?: string;
	}

	let {
		id,
		name,
		value = $bindable(),
		min,
		max,
		required = false,
		shortcuts = true,
		placeholder = 'Choose a day'
	}: Props = $props();

	// Phones and tablets have a good built-in date picker (the iPhone wheel), so use that there.
	const touch = new MediaQuery('(pointer: coarse)', true);

	let open = $state(false);
	const toValue = (d: ISODate | undefined) => (d && isValidDate(d) ? toCalendarDate(d) : undefined);
	const selected = $derived(toValue(value));

	function choose(d: ISODate) {
		value = d;
		open = false;
	}

	const today = nowUK().date;
	const inRange = (d: ISODate) => (!min || d >= min) && (!max || d <= max);
</script>

{#if touch.current}
	<Input {id} {name} type="date" {min} {max} {required} bind:value />
	{#if selected}<p class="text-sm text-ink-soft">{formatLong(value, true)}</p>{/if}
{:else}
	{#if name}<input type="hidden" {name} {value} />{/if}
	<Popover.Root bind:open>
		<Popover.Trigger
			{id}
			class="flex h-12 w-full items-center gap-2.5 rounded-xl border border-input bg-transparent px-3.5 text-left text-base font-medium text-ink transition-[border-color,box-shadow] outline-none hover:border-ink-soft/50 focus-visible:border-ball-ink focus-visible:ring-3 focus-visible:ring-ball-ink/15 data-[state=open]:border-ball-ink data-[state=open]:ring-3 data-[state=open]:ring-ball-ink/15"
		>
			<CalendarDays class="size-4.5 shrink-0 text-ink-soft" />
			<span class={['flex-1 truncate', !selected && 'font-normal text-ink-soft/70']}>
				{selected ? formatLong(value, true) : placeholder}
			</span>
			<ChevronDown
				class="size-4 shrink-0 text-ink-soft transition-transform {open ? 'rotate-180' : ''}"
			/>
		</Popover.Trigger>
		<Popover.Content align="start" class="w-auto">
			<Calendar
				type="single"
				value={selected}
				onValueChange={(v: DateValue | undefined) => v && choose(v.toString())}
				minValue={toValue(min)}
				maxValue={toValue(max)}
				weekStartsOn={1}
				fixedWeeks
				initialFocus
			/>
			{#if shortcuts}
				<div class="grid grid-cols-2 gap-2 border-t border-line pt-3">
					{#each [{ label: 'Today', d: today }, { label: 'Tomorrow', d: addDays(today, 1) }] as s (s.label)}
						<button
							type="button"
							class="h-10 rounded-full bg-raised text-sm font-medium text-ink transition-colors hover:bg-line disabled:opacity-40"
							disabled={!inRange(s.d)}
							onclick={() => choose(s.d)}
						>
							{s.label}
						</button>
					{/each}
				</div>
			{/if}
		</Popover.Content>
	</Popover.Root>
{/if}
