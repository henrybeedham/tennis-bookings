import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';
import { limiter } from './ratelimit';

export type Role = 'admin' | 'superadmin';

interface RoleConfig {
	password: string | null;
	cookie: string;
	path: string;
	sameSite: 'lax' | 'strict';
	/** How long a login lasts, in seconds. */
	maxAge: number;
}

const adminPassword = process.env.ADMIN_PASSWORD || 'postoffice';
if (!process.env.ADMIN_PASSWORD) {
	console.warn(
		'[tennis] ADMIN_PASSWORD is not set. The post office password is "postoffice". Set it before going live!'
	);
} else if (adminPassword.length < 10) {
	console.warn('[tennis] ADMIN_PASSWORD is short. Use at least 10 characters, e.g. a few words.');
}

/** The superadmin page is switched off unless it has its own, long password. */
function readSuperadminPassword(): string | null {
	const pw = process.env.SUPERADMIN_PASSWORD;
	if (!pw) return null;
	if (pw.length < 12) {
		console.warn(
			'[tennis] SUPERADMIN_PASSWORD must be at least 12 characters. /superadmin is off.'
		);
		return null;
	}
	if (pw === adminPassword) {
		console.warn(
			'[tennis] SUPERADMIN_PASSWORD must differ from ADMIN_PASSWORD. /superadmin is off.'
		);
		return null;
	}
	return pw;
}

const ROLES: Record<Role, RoleConfig> = {
	admin: {
		password: adminPassword,
		cookie: 'po_session',
		path: '/',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30
	},
	superadmin: {
		password: readSuperadminPassword(),
		cookie: 'sa_session',
		path: '/superadmin',
		sameSite: 'strict',
		maxAge: 60 * 60 * 8
	}
};

export const superadminEnabled = ROLES.superadmin.password !== null;

const sha256 = (s: string) => createHash('sha256').update(s).digest();
const hashToken = (token: string) => sha256(token).toString('hex');

/** Compares hashes, so the time taken says nothing about the password's length. */
function safeEqual(a: string, b: string) {
	return timingSafeEqual(sha256(a), sha256(b));
}

// When a password changes, everyone logged in with the old one is logged out.
for (const [role, { password }] of Object.entries(ROLES) as [Role, RoleConfig][]) {
	const row = db.query('SELECT salt, hash FROM auth_passwords WHERE role = ?').get(role) as {
		salt: string;
		hash: string;
	} | null;
	const unchanged =
		!!row &&
		!!password &&
		timingSafeEqual(scryptSync(password, row.salt, 32), Buffer.from(row.hash, 'hex'));
	if (unchanged) continue;

	db.query('DELETE FROM sessions WHERE role = ?').run(role);
	if (password) {
		const salt = randomBytes(16).toString('hex');
		db.query(
			`INSERT INTO auth_passwords (role, salt, hash) VALUES (?, ?, ?)
			 ON CONFLICT(role) DO UPDATE SET salt = excluded.salt, hash = excluded.hash`
		).run(role, salt, scryptSync(password, salt, 32).toString('hex'));
	} else {
		db.query('DELETE FROM auth_passwords WHERE role = ?').run(role);
	}
}
db.query('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

export function hasSession(cookies: Cookies, role: Role): boolean {
	const { cookie, password } = ROLES[role];
	const token = cookies.get(cookie);
	if (!token || !password) return false;
	return !!db
		.query('SELECT 1 FROM sessions WHERE token_hash = ? AND role = ? AND expires_at > ?')
		.get(hashToken(token), role, Date.now());
}

// Wrong passwords: 5 per address, and 50 in total per page, every 15 minutes.
// The total stops someone guessing from lots of addresses at once.
const LOGIN_WINDOW = 15 * 60 * 1000;
const loginsByIp = limiter(5, LOGIN_WINDOW);
const loginsOverall = limiter(50, LOGIN_WINDOW);

export type LoginResult = 'ok' | 'wrong' | 'locked';

export function logIn(
	role: Role,
	attempt: unknown,
	ip: string,
	cookies: Cookies,
	secure: boolean
): LoginResult {
	const config = ROLES[role];
	const overall = `all:${role}`;
	if (loginsByIp.blocked(ip) || loginsOverall.blocked(overall)) return 'locked';

	if (
		!config.password ||
		typeof attempt !== 'string' ||
		!safeEqual(attempt.trim(), config.password)
	) {
		loginsByIp.hit(ip);
		loginsOverall.hit(overall);
		return 'wrong';
	}
	loginsByIp.clear(ip);

	const token = randomBytes(32).toString('base64url');
	const now = Date.now();
	db.query('DELETE FROM sessions WHERE expires_at < ?').run(now);
	db.query('INSERT INTO sessions (token_hash, role, expires_at) VALUES (?, ?, ?)').run(
		hashToken(token),
		role,
		now + config.maxAge * 1000
	);
	cookies.set(config.cookie, token, {
		path: config.path,
		httpOnly: true,
		sameSite: config.sameSite,
		secure,
		maxAge: config.maxAge
	});
	return 'ok';
}

export function logOut(cookies: Cookies, role: Role) {
	const { cookie, path } = ROLES[role];
	const token = cookies.get(cookie);
	if (token) db.query('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
	cookies.delete(cookie, { path });
}

export const LOCKED_MESSAGE = 'Too many wrong passwords. Please wait 15 minutes and try again.';
