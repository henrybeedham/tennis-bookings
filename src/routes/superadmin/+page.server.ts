import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { LOCKED_MESSAGE, logIn, logOut, superadminEnabled } from '#lib/server/auth.js';
import { bookingsByIp, deleteUpcomingByIp } from '#lib/server/bookings.js';
import { clientIp } from '#lib/server/ip.js';

// Nothing links here. Without SUPERADMIN_PASSWORD the page doesn't exist at all.
function ensureEnabled() {
	if (!superadminEnabled) error(404, 'Not Found');
}

export const load: PageServerLoad = ({ locals }) => {
	ensureEnabled();
	if (!locals.superadmin) return { superadmin: false as const };
	return { superadmin: true as const, groups: bookingsByIp() };
};

export const actions: Actions = {
	login: async (event) => {
		ensureEnabled();
		const data = await event.request.formData();
		const result = logIn(
			'superadmin',
			data.get('password'),
			clientIp(event),
			event.cookies,
			event.url.protocol === 'https:'
		);
		if (result === 'locked') return fail(429, { error: LOCKED_MESSAGE });
		if (result === 'wrong') return fail(400, { error: 'That password isn’t right.' });
		redirect(303, '/superadmin');
	},

	logout: async ({ cookies }) => {
		logOut(cookies, 'superadmin');
		redirect(303, '/superadmin');
	},

	deleteByIp: async ({ request, locals }) => {
		ensureEnabled();
		if (!locals.superadmin) return fail(401, { error: 'Please log in again.' });
		const ip = String((await request.formData()).get('ip') ?? '').trim();
		if (!ip) return fail(400, { error: 'No address given.' });
		return { deleted: deleteUpcomingByIp(ip) };
	}
};
