import { isValidDate, nowUK, startOfWeek, addDays, parseTime } from '../dates';
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

/** Works out which week to show from ?date=… */
export function weekFromUrl(url: URL) {
	const now = nowUK();
	const param = url.searchParams.get('date');
	const focus = isValidDate(param) ? param : now.date;
	const weekStart = startOfWeek(focus);
	return { now, focus, weekStart, weekEnd: addDays(weekStart, 6) };
}
