import type { Cookies } from '@sveltejs/kit';
import { isValidDate, nowUK, startOfWeek, addDays, parseTime, monthGrid } from '../dates';
import type { BookingInput } from './bookings';

/** Reads the booking form. The end can be given as "end" (HH:MM) or "duration" (minutes). */
export function readBookingForm(data: FormData): BookingInput {
	const start = parseTime(data.get('start'));
	let end = parseTime(data.get('end'));
	const duration = Number(data.get('duration'));
	if (end == null && start != null && duration > 0) end = start + duration;
	return {
		date: data.get('date'),
		start,
		end,
		name: data.get('name'),
		phone: data.get('phone'),
		note: data.get('note'),
		kind: data.get('kind') === 'block' ? 'block' : 'booking'
	};
}

export type View = 'day' | 'week' | 'month';
export const VIEW_COOKIE = 'tb_view';

/**
 * Works out which days to load from ?date=… and the view (?view=…, or the view the
 * person last chose, remembered in a cookie). Day and week views load the week;
 * month view loads the six weeks shown in the month grid.
 */
export function rangeFromUrl(url: URL, cookies: Cookies) {
	const now = nowUK();
	const param = url.searchParams.get('date');
	const focus = isValidDate(param) ? param : now.date;
	const asked = url.searchParams.get('view') ?? cookies.get(VIEW_COOKIE);
	const view: View = asked === 'day' || asked === 'month' ? asked : 'week';
	const weekStart = startOfWeek(focus);
	const grid = monthGrid(focus);
	const [from, to] =
		view === 'month' ? [grid[0], grid[grid.length - 1]] : [weekStart, addDays(weekStart, 6)];
	return { now, focus, view, weekStart, from, to };
}
