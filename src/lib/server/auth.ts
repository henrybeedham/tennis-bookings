import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

export const COOKIE = 'po_session';

const password = process.env.ADMIN_PASSWORD || 'postoffice';
if (!process.env.ADMIN_PASSWORD) {
	console.warn(
		'[tennis] ADMIN_PASSWORD is not set. The post office password is "postoffice". Set it before going live!'
	);
}

// The session token is derived from the password, so changing the password logs everyone out.
const token = createHmac('sha256', password).update('tennis-post-office-session').digest('hex');

function safeEqual(a: string, b: string) {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isAdmin(cookies: Cookies): boolean {
	const value = cookies.get(COOKIE);
	return !!value && safeEqual(value, token);
}

export function checkPassword(attempt: unknown): boolean {
	return typeof attempt === 'string' && safeEqual(attempt.trim(), password);
}

export function logIn(cookies: Cookies, secure: boolean) {
	cookies.set(COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		maxAge: 60 * 60 * 24 * 90
	});
}

export function logOut(cookies: Cookies) {
	cookies.delete(COOKIE, { path: '/' });
}
