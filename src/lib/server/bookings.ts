import { db } from './db';
import {
	addDays,
	formatRange,
	formatShort,
	isValidDate,
	nowUK,
	weekday,
	DAY_NAMES,
	type ISODate
} from '../dates';
import type { AdminSlot, LogEntry, Series, Settings, Slot, SlotKind } from '../types';

/** A problem we can show to the person as-is. */
export class BookingError extends Error {}

/** Someone gave the wrong phone number when cancelling. Counted to stop guessing. */
export class WrongPhoneError extends BookingError {}

const MAX_PUBLIC_LENGTH = 6 * 60; // minutes
const MAX_DAYS_AHEAD = 366;
const MAX_ADMIN_DAYS_AHEAD = 365 * 3;
/** How long a regular booking runs for when it has no end date, and the longest it can be given. */
const SERIES_HORIZON_DAYS = 365 * 2;
/** Full UK numbers have 10 or 11 digits, which makes them hard to guess. */
const MIN_PUBLIC_PHONE_DIGITS = 10;
/** Addresses are kept only to spot and clear out spam, so they're forgotten after this. */
const KEEP_IP_DAYS = 30;

// ---------------------------------------------------------------- settings

const DEFAULT_SETTINGS: Settings = {
	title: 'Village Tennis Court',
	open: 8 * 60,
	close: 21 * 60,
	notice: '',
	contact: ''
};

export function getSettings(): Settings {
	const rows = db.query('SELECT key, value FROM settings').all() as {
		key: string;
		value: string;
	}[];
	const s = { ...DEFAULT_SETTINGS };
	for (const { key, value } of rows) {
		if (key === 'open' || key === 'close') s[key] = Number(value);
		else if (key === 'notice' || key === 'contact' || key === 'title') s[key] = value;
	}
	return s;
}

export function saveSettings(s: Settings) {
	if (!(s.open >= 0 && s.close <= 24 * 60 && s.open < s.close)) {
		throw new BookingError('Closing time must be after opening time.');
	}
	const upsert = db.query(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	);
	db.transaction(() => {
		upsert.run('title', s.title.trim() || DEFAULT_SETTINGS.title);
		upsert.run('open', String(s.open));
		upsert.run('close', String(s.close));
		upsert.run('notice', s.notice.trim());
		upsert.run('contact', s.contact.trim());
	})();
	log(
		'Settings changed',
		`${s.open === 0 && s.close === 24 * 60 ? 'Open all the time' : `Hours ${formatRange(s.open, s.close)}`}${s.notice ? ` · Notice: “${s.notice}”` : ''}`
	);
}

// ---------------------------------------------------------------- helpers

/** Keeps digits only and turns +44 numbers into 0… so "07700 900123" matches "+44 7700 900123". */
export function normalisePhone(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	let digits = raw.replace(/\D/g, '');
	if (digits.startsWith('44') && digits.length >= 11) digits = '0' + digits.slice(2);
	return digits.length >= 6 ? digits : null;
}

function cleanText(raw: unknown, max: number): string {
	return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

export function log(action: string, detail: string) {
	db.query('INSERT INTO log (action, detail) VALUES (?, ?)').run(action, detail);
}

export function recentLog(limit = 150): LogEntry[] {
	return db
		.query('SELECT id, at, action, detail FROM log ORDER BY id DESC LIMIT ?')
		.all(limit) as LogEntry[];
}

const describe = (s: { name: string; date: ISODate; start: number; end: number }) =>
	`${s.name} · ${DAY_NAMES[weekday(s.date)].slice(0, 3)} ${formatShort(s.date)} ${formatRange(s.start, s.end)}`;

// ---------------------------------------------------------------- reading

interface BookingRow {
	id: number;
	date: string;
	start: number;
	end: number;
	name: string;
	phone: string | null;
	note: string | null;
	kind: SlotKind;
	created_by: 'public' | 'admin';
	created_at: string;
}

interface SeriesRow {
	id: number;
	weekday: number;
	start: number;
	end: number;
	start_date: string;
	end_date: string | null;
	name: string;
	phone: string | null;
	note: string | null;
	kind: SlotKind;
	created_at: string;
}

const toSeries = (r: SeriesRow): Series => ({
	id: r.id,
	weekday: r.weekday,
	start: r.start,
	end: r.end,
	startDate: r.start_date,
	endDate: r.end_date,
	name: r.name,
	phone: r.phone,
	note: r.note,
	kind: r.kind
});

/** Everything on the calendar between two dates (inclusive), with full details. */
export function getAdminSlots(from: ISODate, to: ISODate): AdminSlot[] {
	const one = db
		.query('SELECT * FROM bookings WHERE date BETWEEN ? AND ? ORDER BY date, start')
		.all(from, to) as BookingRow[];

	const slots: AdminSlot[] = one.map((r) => ({
		id: `b${r.id}`,
		ref: `b${r.id}@${r.created_at}`,
		date: r.date,
		start: r.start,
		end: r.end,
		name: r.name,
		note: r.note,
		kind: r.kind,
		recurring: false,
		cancellable: !!r.phone && r.kind === 'booking',
		phone: r.phone,
		createdBy: r.created_by,
		createdAt: r.created_at,
		seriesId: null
	}));

	const series = db
		.query('SELECT * FROM series WHERE start_date <= ? AND (end_date IS NULL OR end_date >= ?)')
		.all(to, from) as SeriesRow[];

	if (series.length) {
		const skips = new Set(
			(
				db
					.query('SELECT series_id, date FROM series_skips WHERE date BETWEEN ? AND ?')
					.all(from, to) as { series_id: number; date: string }[]
			).map((s) => `${s.series_id}:${s.date}`)
		);
		for (let d = from; d <= to; d = addDays(d, 1)) {
			const wd = weekday(d);
			for (const s of series) {
				if (s.weekday !== wd || d < s.start_date || (s.end_date && d > s.end_date)) continue;
				if (skips.has(`${s.id}:${d}`)) continue;
				slots.push({
					id: `s${s.id}:${d}`,
					ref: `s${s.id}:${d}@${s.created_at}`,
					date: d,
					start: s.start,
					end: s.end,
					name: s.name,
					note: s.note,
					kind: s.kind,
					recurring: true,
					cancellable: !!s.phone && s.kind === 'booking',
					phone: s.phone,
					createdBy: 'admin',
					createdAt: s.created_at,
					seriesId: s.id
				});
			}
		}
	}

	return slots.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
}

/** Strips phone numbers and other private details before sending to the browser. */
export function toPublic(s: AdminSlot): Slot {
	return {
		id: s.id,
		ref: s.ref,
		date: s.date,
		start: s.start,
		end: s.end,
		name: s.name,
		note: s.note,
		kind: s.kind,
		recurring: s.recurring,
		cancellable: s.cancellable
	};
}

export function getPublicSlots(from: ISODate, to: ISODate): Slot[] {
	return getAdminSlots(from, to).map(toPublic);
}

function findClash(date: ISODate, start: number, end: number): AdminSlot | undefined {
	return getAdminSlots(date, date).find((s) => s.start < end && s.end > start);
}

export function listSeries(): Series[] {
	const today = nowUK().date;
	return (
		db
			.query('SELECT * FROM series WHERE end_date IS NULL OR end_date >= ? ORDER BY weekday, start')
			.all(today) as SeriesRow[]
	).map(toSeries);
}

// ---------------------------------------------------------------- writing

export interface BookingInput {
	date: unknown;
	start: number | null;
	end: number | null;
	name: unknown;
	phone: unknown;
	note?: unknown;
	kind?: SlotKind;
}

interface Validated {
	date: ISODate;
	start: number;
	end: number;
	name: string;
	phone: string | null;
	note: string | null;
	kind: SlotKind;
}

/** `keepPhone`: the phone number is the one already on the booking, so isn't checked again. */
function validate(input: BookingInput, admin: boolean, keepPhone = false): Validated {
	const settings = getSettings();
	const now = nowUK();
	const kind: SlotKind = admin && input.kind === 'block' ? 'block' : 'booking';

	if (!isValidDate(input.date)) throw new BookingError('Please choose a day.');
	const date = input.date;
	const { start, end } = input;
	if (start == null || end == null || start % 15 || end % 15 || end <= start) {
		throw new BookingError('Please choose a start time and how long you want the court.');
	}
	if (start < settings.open || end > settings.close) {
		throw new BookingError(
			`The court can be booked between ${formatRange(settings.open, settings.close)}.`
		);
	}

	const name = cleanText(input.name, 60);
	if (!name) {
		throw new BookingError(
			kind === 'block' ? 'Please give a reason, like “Maintenance”.' : 'Please enter your name.'
		);
	}

	const phone = normalisePhone(input.phone);
	if (keepPhone) {
		// Nothing to check.
	} else if (!admin && !phone) {
		throw new BookingError('Please enter your phone number. You’ll need it if you want to cancel.');
	} else if (!admin && phone && phone.length < MIN_PUBLIC_PHONE_DIGITS) {
		throw new BookingError('Please enter your full phone number, including the area code.');
	} else if (admin && cleanText(input.phone, 40) && !phone) {
		throw new BookingError('That phone number doesn’t look right.');
	}

	if (!admin) {
		const currentHalfHour = Math.floor(now.minutes / 30) * 30;
		if (date < now.date || (date === now.date && start < currentHalfHour)) {
			throw new BookingError('That time has already passed. Please choose a later time.');
		}
		if (date > addDays(now.date, MAX_DAYS_AHEAD)) {
			throw new BookingError('You can only book up to a year ahead.');
		}
		if (end - start > MAX_PUBLIC_LENGTH) {
			throw new BookingError(
				'You can book up to 6 hours at a time. For longer, please ask the post office.'
			);
		}
	} else if (date > addDays(now.date, MAX_ADMIN_DAYS_AHEAD)) {
		throw new BookingError('Bookings can be made up to 3 years ahead.');
	}

	return { date, start, end, name, phone, note: cleanText(input.note, 200) || null, kind };
}

/** `ip` is the address a public booking came from, so spam can be cleared out by address. */
export function createBooking(
	input: BookingInput,
	admin: boolean,
	ip: string | null = null
): AdminSlot {
	const v = validate(input, admin);
	if (ip) forgetOldIps();

	return db.transaction(() => {
		const clash = findClash(v.date, v.start, v.end);
		if (clash) {
			throw new BookingError(
				clash.kind === 'block'
					? `Sorry, the court isn’t available then (${clash.name}, ${formatRange(clash.start, clash.end)}).`
					: `Sorry, that clashes with ${admin ? `${clash.name}’s` : 'another'} booking (${formatRange(clash.start, clash.end)}). Please choose another time.`
			);
		}
		const row = db
			.query(
				`INSERT INTO bookings (date, start, end, name, phone, note, kind, created_by, ip)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
			)
			.get(
				v.date,
				v.start,
				v.end,
				v.name,
				v.phone,
				v.note,
				v.kind,
				admin ? 'admin' : 'public',
				admin ? null : ip
			) as {
			id: number;
		};

		log(
			v.kind === 'block' ? 'Court blocked out' : 'Booked',
			`${describe(v)}${admin ? ' (post office)' : ''}`
		);
		const slot = getAdminSlots(v.date, v.date).find((s) => s.id === `b${row.id}`);
		return slot!;
	})();
}

export interface SeriesInput extends BookingInput {
	until: unknown;
}

/** Creates a weekly regular booking. Weeks that already have a one-off booking at that time are skipped. */
export function createSeries(input: SeriesInput): { skipped: ISODate[] } {
	const v = validate(input, true);
	let until: ISODate | null = null;
	if (typeof input.until === 'string' && input.until) {
		if (!isValidDate(input.until)) throw new BookingError('The “until” date isn’t valid.');
		if (input.until < v.date)
			throw new BookingError('The “until” date must be after the first week.');
		if (input.until > addDays(v.date, SERIES_HORIZON_DAYS))
			throw new BookingError(
				'A regular booking can run for up to 2 years. Add it again after that.'
			);
		until = input.until;
	}

	return db.transaction(() => {
		const skipped: ISODate[] = [];
		const horizon = until ?? addDays(v.date, SERIES_HORIZON_DAYS);
		for (let d = v.date; d <= horizon; d = addDays(d, 7)) {
			const clash = findClash(d, v.start, v.end);
			if (!clash) continue;
			if (clash.recurring) {
				throw new BookingError(
					`That clashes with ${clash.name}’s regular booking (${DAY_NAMES[weekday(d)]}s ${formatRange(clash.start, clash.end)}).`
				);
			}
			skipped.push(d);
		}

		const row = db
			.query(
				`INSERT INTO series (weekday, start, end, start_date, end_date, name, phone, note, kind)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
			)
			.get(weekday(v.date), v.start, v.end, v.date, until, v.name, v.phone, v.note, v.kind) as {
			id: number;
		};

		const skip = db.query('INSERT INTO series_skips (series_id, date) VALUES (?, ?)');
		for (const d of skipped) skip.run(row.id, d);

		log(
			v.kind === 'block' ? 'Regular block-out added' : 'Regular booking added',
			`${v.name} · every ${DAY_NAMES[weekday(v.date)]} ${formatRange(v.start, v.end)} from ${formatShort(v.date)}${until ? ` until ${formatShort(until)}` : ''}`
		);
		return { skipped };
	})();
}

function findSlot(id: string): AdminSlot | undefined {
	if (id.startsWith('b')) {
		const row = db.query('SELECT date FROM bookings WHERE id = ?').get(Number(id.slice(1))) as {
			date: string;
		} | null;
		return row ? getAdminSlots(row.date, row.date).find((s) => s.id === id) : undefined;
	}
	const date = id.startsWith('s') ? id.split(':')[1] : null;
	return date && isValidDate(date) ? getAdminSlots(date, date).find((s) => s.id === id) : undefined;
}

function clashMessage(clash: AdminSlot) {
	return clash.kind === 'block'
		? `The court is blocked out then (${clash.name}, ${formatRange(clash.start, clash.end)}).`
		: `That clashes with ${clash.name}’s booking (${formatRange(clash.start, clash.end)}).`;
}

/**
 * Changes a booking or block-out (post office only). A one-off is changed in place. For a week
 * of a regular booking, `scope` says whether to change just that week (it becomes a one-off) or
 * that week and every week after it (the day stays the same). Returns weeks skipped because
 * something else was already booked then.
 */
export function editSlot(
	id: string,
	input: BookingInput,
	scope: 'once' | 'series'
): { skipped: ISODate[] } {
	const slot = findSlot(id);
	if (!slot) throw new BookingError('That booking no longer exists. It may have been cancelled.');
	const kind = slot.kind;

	if (slot.seriesId == null) {
		const v = validate({ ...input, kind }, true);
		return db.transaction(() => {
			const clash = getAdminSlots(v.date, v.date).find(
				(s) => s.id !== slot.id && s.start < v.end && s.end > v.start
			);
			if (clash) throw new BookingError(clashMessage(clash));
			db.query(
				'UPDATE bookings SET date = ?, start = ?, end = ?, name = ?, phone = ?, note = ? WHERE id = ?'
			).run(v.date, v.start, v.end, v.name, v.phone, v.note, Number(slot.id.slice(1)));
			log(
				kind === 'block' ? 'Block-out changed' : 'Booking changed',
				`${describe(slot)} → ${describe(v)} (post office)`
			);
			return { skipped: [] };
		})();
	}

	const seriesId = slot.seriesId;
	const row = db.query('SELECT * FROM series WHERE id = ?').get(seriesId) as SeriesRow | null;
	if (!row) throw new BookingError('That regular booking no longer exists.');

	if (scope === 'once') {
		const v = validate({ ...input, kind }, true);
		return db.transaction(() => {
			// Take this week out of the regular booking, then add it back as a one-off.
			db.query('INSERT OR IGNORE INTO series_skips (series_id, date) VALUES (?, ?)').run(
				seriesId,
				slot.date
			);
			const clash = findClash(v.date, v.start, v.end);
			if (clash) throw new BookingError(clashMessage(clash));
			db.query(
				`INSERT INTO bookings (date, start, end, name, phone, note, kind, created_by)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'admin')`
			).run(v.date, v.start, v.end, v.name, v.phone, v.note, kind);
			log(
				kind === 'block' ? 'Block-out changed (one week)' : 'Booking changed (one week)',
				`${describe(slot)} → ${describe(v)}`
			);
			return { skipped: [] };
		})();
	}

	// This week and after: the day of the week stays the same.
	const from = slot.date;
	const v = validate({ ...input, date: from, kind }, true);
	return db.transaction(() => {
		const oldSkips = new Set(
			(
				db
					.query('SELECT date FROM series_skips WHERE series_id = ? AND date >= ?')
					.all(seriesId, from) as { date: string }[]
			).map((r) => r.date)
		);
		const lastDate = addDays(from, -1);
		if (lastDate < row.start_date) db.query('DELETE FROM series WHERE id = ?').run(seriesId);
		else db.query('UPDATE series SET end_date = ? WHERE id = ?').run(lastDate, seriesId);

		const skipped: ISODate[] = [];
		const skips: ISODate[] = [];
		const horizon = row.end_date ?? addDays(from, SERIES_HORIZON_DAYS);
		for (let d = from; d <= horizon; d = addDays(d, 7)) {
			// Weeks that were cancelled stay cancelled.
			if (oldSkips.has(d)) {
				skips.push(d);
				continue;
			}
			const clash = findClash(d, v.start, v.end);
			if (!clash) continue;
			if (clash.recurring) {
				throw new BookingError(
					`That clashes with ${clash.name}’s regular booking (${DAY_NAMES[weekday(d)]}s ${formatRange(clash.start, clash.end)}).`
				);
			}
			skipped.push(d);
			skips.push(d);
		}

		const created = db
			.query(
				`INSERT INTO series (weekday, start, end, start_date, end_date, name, phone, note, kind)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
			)
			.get(row.weekday, v.start, v.end, from, row.end_date, v.name, v.phone, v.note, kind) as {
			id: number;
		};
		const skip = db.query('INSERT INTO series_skips (series_id, date) VALUES (?, ?)');
		for (const d of skips) skip.run(created.id, d);

		log(
			kind === 'block' ? 'Regular block-out changed' : 'Regular booking changed',
			`${row.name} · every ${DAY_NAMES[row.weekday]} ${formatRange(row.start, row.end)} → ${v.name} · ${formatRange(v.start, v.end)}, from ${formatShort(from)}`
		);
		return { skipped };
	})();
}

/** Stops a regular booking so its last week is `lastDate` (or removes it entirely if that's before it starts). */
export function endSeries(id: number, fromDate: ISODate) {
	const row = db.query('SELECT * FROM series WHERE id = ?').get(id) as SeriesRow | null;
	if (!row) throw new BookingError('That regular booking no longer exists.');
	const lastDate = addDays(fromDate, -1);
	if (lastDate < row.start_date) {
		db.query('DELETE FROM series WHERE id = ?').run(id);
	} else {
		db.query('UPDATE series SET end_date = ? WHERE id = ?').run(lastDate, id);
	}
	log(
		'Regular booking stopped',
		`${row.name} · every ${DAY_NAMES[row.weekday]} ${formatRange(row.start, row.end)} · no more after ${formatShort(lastDate)}`
	);
}

/** Members of the public prove a booking is theirs with the phone number it was made with. */
function checkOwner(slot: AdminSlot, rawPhone: unknown, doing: 'cancel' | 'change') {
	if (slot.kind === 'block') throw new BookingError('Only the post office can change this.');
	if (!slot.phone) {
		throw new BookingError(
			`This booking was made at the post office. Please ask them to ${doing} it.`
		);
	}
	const now = nowUK();
	if (slot.date < now.date || (slot.date === now.date && slot.end <= now.minutes)) {
		throw new BookingError('This booking has already finished.');
	}
	const phone = normalisePhone(rawPhone);
	if (!phone || phone !== slot.phone) {
		throw new WrongPhoneError('That phone number doesn’t match the one used to make this booking.');
	}
}

/**
 * Lets the person who made a booking change its day, time or name. They prove it's theirs with
 * the phone number they booked with, which stays the same. Regular bookings are changed by the
 * post office.
 */
export function changeOwnBooking(id: string, input: BookingInput, rawPhone: unknown): AdminSlot {
	const slot = findSlot(id);
	if (!slot) throw new BookingError('That booking has been cancelled.');
	checkOwner(slot, rawPhone, 'change');
	if (slot.recurring) {
		throw new BookingError('This is a regular booking. Please ask the post office to change it.');
	}
	const now = nowUK();
	if (slot.date < now.date || (slot.date === now.date && slot.start <= now.minutes)) {
		throw new BookingError('This booking has already started, so it can’t be changed.');
	}
	const v = validate(
		{ ...input, phone: slot.phone, note: slot.note, kind: 'booking' },
		false,
		true
	);
	return db.transaction(() => {
		const clash = getAdminSlots(v.date, v.date).find(
			(s) => s.id !== slot.id && s.start < v.end && s.end > v.start
		);
		if (clash) {
			throw new BookingError(
				clash.kind === 'block'
					? `Sorry, the court isn’t available then (${clash.name}, ${formatRange(clash.start, clash.end)}).`
					: `Sorry, that clashes with another booking (${formatRange(clash.start, clash.end)}). Please choose another time.`
			);
		}
		db.query('UPDATE bookings SET date = ?, start = ?, end = ?, name = ? WHERE id = ?').run(
			v.date,
			v.start,
			v.end,
			v.name,
			Number(slot.id.slice(1))
		);
		log('Booking changed', `${describe(slot)} → ${describe(v)} (online)`);
		return findSlot(slot.id)!;
	})();
}

/**
 * Cancels one slot. Members of the public must give the phone number the
 * booking was made with; the post office can cancel anything.
 */
export function cancelSlot(id: string, opts: { admin: boolean; phone?: unknown }): AdminSlot {
	const slot = findSlot(id);
	if (!slot) throw new BookingError('That booking has already been cancelled.');

	if (!opts.admin) checkOwner(slot, opts.phone, 'cancel');

	if (slot.seriesId != null) {
		db.query('INSERT OR IGNORE INTO series_skips (series_id, date) VALUES (?, ?)').run(
			slot.seriesId,
			slot.date
		);
	} else {
		db.query('DELETE FROM bookings WHERE id = ?').run(Number(slot.id.slice(1)));
	}
	log(
		slot.kind === 'block'
			? 'Block-out removed'
			: slot.recurring
				? 'Cancelled one week'
				: 'Cancelled',
		`${describe(slot)}${opts.admin ? ' (post office)' : ''}`
	);
	return slot;
}

// ---------------------------------------------------------------- superadmin

/** Clears the address from bookings that finished a while ago. */
export function forgetOldIps() {
	db.query('UPDATE bookings SET ip = NULL WHERE ip IS NOT NULL AND date < ?').run(
		addDays(nowUK().date, -KEEP_IP_DAYS)
	);
}

export interface IpBooking {
	id: number;
	date: ISODate;
	start: number;
	end: number;
	name: string;
	createdAt: string;
}

export interface IpGroup {
	ip: string;
	bookings: IpBooking[];
	names: string[];
	firstMade: string;
	lastMade: string;
}

const UPCOMING = '(date > ? OR (date = ? AND end > ?))';

/** Upcoming public bookings grouped by the address they came from, most first. */
export function bookingsByIp(): IpGroup[] {
	forgetOldIps();
	const now = nowUK();
	const rows = db
		.query(
			`SELECT id, date, start, end, name, created_at, ip FROM bookings
			 WHERE ip IS NOT NULL AND ${UPCOMING} ORDER BY date, start`
		)
		.all(now.date, now.date, now.minutes) as (Pick<
		BookingRow,
		'id' | 'date' | 'start' | 'end' | 'name' | 'created_at'
	> & { ip: string })[];

	const groups = new Map<string, IpGroup>();
	for (const r of rows) {
		let g = groups.get(r.ip);
		if (!g) {
			g = { ip: r.ip, bookings: [], names: [], firstMade: r.created_at, lastMade: r.created_at };
			groups.set(r.ip, g);
		}
		g.bookings.push({
			id: r.id,
			date: r.date,
			start: r.start,
			end: r.end,
			name: r.name,
			createdAt: r.created_at
		});
		if (!g.names.includes(r.name)) g.names.push(r.name);
		if (r.created_at < g.firstMade) g.firstMade = r.created_at;
		if (r.created_at > g.lastMade) g.lastMade = r.created_at;
	}
	return [...groups.values()].sort((a, b) => b.bookings.length - a.bookings.length);
}

/** Cancels every upcoming booking made from one address. Past ones are left as they were. */
export function deleteUpcomingByIp(ip: string): number {
	const now = nowUK();
	const { changes } = db
		.query(`DELETE FROM bookings WHERE ip = ? AND ${UPCOMING}`)
		.run(ip, now.date, now.date, now.minutes);
	if (changes) {
		log(
			'Bookings removed',
			`${changes} upcoming booking${changes === 1 ? '' : 's'} made from one internet address (superadmin)`
		);
	}
	return changes;
}

export function logCount(): number {
	return (db.query('SELECT COUNT(*) AS n FROM log').get() as { n: number }).n;
}

/** Empties the post office's activity log, leaving one entry to say it was cleared. */
export function clearLog(): number {
	return db.transaction(() => {
		const { changes } = db.query('DELETE FROM log').run();
		log('Activity cleared', `${changes} entr${changes === 1 ? 'y' : 'ies'} removed (superadmin)`);
		return changes;
	})();
}
