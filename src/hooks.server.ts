import type { Handle } from '@sveltejs/kit/hooks';
import { hasSession } from '#lib/server/auth.js';

const PRIVATE_PAGES = ['/post-office', '/superadmin'];

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	event.locals.admin = hasSession(event.cookies, 'admin');
	event.locals.superadmin =
		pathname.startsWith('/superadmin') && hasSession(event.cookies, 'superadmin');

	const response = await resolve(event);

	// The Content-Security-Policy is set in vite.config.ts.
	const h = response.headers;
	h.set('X-Content-Type-Options', 'nosniff');
	h.set('X-Frame-Options', 'DENY');
	h.set('Referrer-Policy', 'same-origin');
	h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
	h.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
	if (event.url.protocol === 'https:') {
		h.set('Strict-Transport-Security', 'max-age=31536000');
	}
	// Never let Cloudflare or the browser keep a copy of the logged-in pages.
	if (PRIVATE_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
		h.set('Cache-Control', 'private, no-store');
	}
	return response;
};
