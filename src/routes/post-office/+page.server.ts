import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	BookingError,
	cancelSlot,
	createBooking,
	createSeries,
	endSeries,
	getAdminSlots,
	getSettings,
	listSeries,
	recentLog,
	saveSettings
} from '#lib/server/bookings.js';
import { LOCKED_MESSAGE, logIn, logOut } from '#lib/server/auth.js';
import { clientIp } from '#lib/server/ip.js';
import { readBookingForm, rangeFromUrl } from '#lib/server/forms.js';
import { addDays, isValidDate, parseTime } from '#lib/dates.js';

export const load: PageServerLoad = ({ url, locals, depends, cookies }) => {
	if (!locals.admin) return { admin: false as const };
	depends('app:slots');
	const { now, focus, view, weekStart, from, to } = rangeFromUrl(url, cookies);
	return {
		admin: true as const,
		focus,
		view,
		weekStart,
		from,
		to,
		today: now.date,
		nowMinutes: now.minutes,
		slots: getAdminSlots(from, to),
		settings: getSettings(),
		series: listSeries(),
		upcoming: getAdminSlots(now.date, addDays(now.date, 120)).filter(
			(s) => s.date > now.date || s.end > now.minutes
		),
		log: recentLog()
	};
};

/** Wraps an admin action: checks the session and turns BookingErrors into form errors. */
function guarded<T>(fn: (data: FormData) => T) {
	return async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		if (!locals.admin) return fail(401, { error: 'Please log in again.' });
		const data = await request.formData();
		try {
			return fn(data);
		} catch (e) {
			if (e instanceof BookingError) return fail(400, { error: e.message });
			throw e;
		}
	};
}

export const actions: Actions = {
	login: async (event) => {
		const data = await event.request.formData();
		const result = logIn(
			'admin',
			data.get('password'),
			clientIp(event),
			event.cookies,
			event.url.protocol === 'https:'
		);
		if (result === 'locked') return fail(429, { error: LOCKED_MESSAGE });
		if (result === 'wrong') return fail(400, { error: 'That password isn’t right.' });
		redirect(303, '/post-office');
	},

	logout: async ({ cookies }) => {
		logOut(cookies, 'admin');
		redirect(303, '/post-office');
	},

	book: guarded((data) => {
		const input = readBookingForm(data);
		if (data.get('repeat') === 'weekly') {
			const { skipped } = createSeries({ ...input, until: data.get('until') });
			return { ok: true, skipped };
		}
		createBooking(input, true);
		return { ok: true, skipped: [] as string[] };
	}),

	cancel: guarded((data) => {
		const id = String(data.get('id'));
		if (data.get('scope') === 'series') {
			const seriesId = Number(data.get('seriesId'));
			const from = String(data.get('date'));
			if (!seriesId || !isValidDate(from))
				throw new BookingError('Something went wrong. Please try again.');
			endSeries(seriesId, from);
		} else {
			cancelSlot(id, { admin: true });
		}
		return { ok: true };
	}),

	endSeries: guarded((data) => {
		const id = Number(data.get('seriesId'));
		const from = String(data.get('from'));
		if (!id || !isValidDate(from)) throw new BookingError('Please choose the date to stop from.');
		endSeries(id, from);
		return { ok: true };
	}),

	settings: guarded((data) => {
		const open = parseTime(data.get('open'));
		const close = parseTime(data.get('close'));
		if (open == null || close == null)
			throw new BookingError('Please choose opening and closing times.');
		saveSettings({
			title: String(data.get('title') ?? '').slice(0, 80),
			open,
			close,
			notice: String(data.get('notice') ?? '').slice(0, 300),
			contact: String(data.get('contact') ?? '').slice(0, 300)
		});
		return { ok: true };
	})
};
