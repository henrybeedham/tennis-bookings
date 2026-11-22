import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	BookingError,
	cancelSlot,
	createBooking,
	getPublicSlots,
	getSettings,
	toPublic
} from '#lib/server/bookings.js';
import { readBookingForm, rangeFromUrl } from '#lib/server/forms.js';

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
	book: async ({ request }) => {
		const data = await request.formData();
		try {
			const slot = createBooking(readBookingForm(data), false);
			return { booked: toPublic(slot) };
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { error: e.message });
			throw e;
		}
	},

	cancel: async ({ request }) => {
		const data = await request.formData();
		try {
			const slot = cancelSlot(String(data.get('id')), { admin: false, phone: data.get('phone') });
			return { cancelled: toPublic(slot) };
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { error: e.message });
			throw e;
		}
	}
};
