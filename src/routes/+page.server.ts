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
import { readBookingForm, weekFromUrl } from '#lib/server/forms.js';

export const load: PageServerLoad = ({ url, depends }) => {
	depends('app:slots');
	const { now, focus, weekStart, weekEnd } = weekFromUrl(url);
	return {
		focus,
		weekStart,
		today: now.date,
		nowMinutes: now.minutes,
		slots: getPublicSlots(weekStart, weekEnd),
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
