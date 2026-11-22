import type { Handle } from '@sveltejs/kit/hooks';
import { isAdmin } from '#lib/server/auth.js';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.admin = isAdmin(event.cookies);
	return resolve(event);
};
