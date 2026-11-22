import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	BookingError,
	WrongPhoneError,
	cancelSlot,
	changeOwnBooking,
	createBooking,
	getPublicSlots,
	getSettings,
	toPublic
} from '#lib/server/bookings.js';
import { readBookingForm, rangeFromUrl } from '#lib/server/forms.js';
import { clientIp } from '#lib/server/ip.js';
import { limiter } from '#lib/server/ratelimit.js';

// Wrong phone numbers when cancelling or changing a booking: 10 per address every 15 minutes, and 20 per
// booking a day, so nobody can work through numbers to cancel someone else's booking.
const wrongPhoneByIp = limiter(10, 15 * 60 * 1000);
const wrongPhoneByBooking = limiter(20, 24 * 60 * 60 * 1000);

export const load: PageServerLoad = ({ url, depends, locals, cookies }) => {
	depends('app:slots');
	const { now, focus, view, weekStart, from, to } = rangeFromUrl(url, cookies);
	return {
		/** Logged in as the post office, so show a shortcut to the post office settings. */
		admin: locals.admin,
		focus,
		view,
		weekStart,
		from,
		to,
		today: now.date,
		nowMinutes: now.minutes,
		slots: getPublicSlots(from, to),
		settings: getSettings()
	};
};

export const actions: Actions = {
	book: async (event) => {
		const data = await event.request.formData();
		try {
			const slot = createBooking(readBookingForm(data), false, clientIp(event));
			return { booked: toPublic(slot) };
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { error: e.message });
			throw e;
		}
	},

	cancel: (event) =>
		asOwner(event, (id, data) => ({
			cancelled: toPublic(cancelSlot(id, { admin: false, phone: data.get('phone') }))
		})),

	change: (event) =>
		asOwner(event, (id, data) => ({
			changed: toPublic(changeOwnBooking(id, readBookingForm(data), data.get('owner-phone')))
		}))
};

/** Runs something that needs the booking's phone number, counting wrong guesses. */
async function asOwner<T>(
	event: Parameters<Actions[string]>[0],
	fn: (id: string, data: FormData) => T
) {
	const data = await event.request.formData();
	const id = String(data.get('id'));
	const ip = clientIp(event);
	if (wrongPhoneByIp.blocked(ip) || wrongPhoneByBooking.blocked(id)) {
		return fail(429, {
			error: 'Too many wrong phone numbers. Please try again later, or ask the post office.'
		});
	}
	try {
		return fn(id, data);
	} catch (e) {
		if (e instanceof WrongPhoneError) {
			wrongPhoneByIp.hit(ip);
			wrongPhoneByBooking.hit(id);
		}
		if (e instanceof BookingError) return fail(400, { error: e.message });
		throw e;
	}
}
