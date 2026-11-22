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

const MAX_PUBLIC_LENGTH = 6 * 60; // minutes
const MAX_DAYS_AHEAD = 366;
const SERIES_HORIZON_DAYS = 365 * 2;

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

function validate(input: BookingInput, admin: boolean): Validated {
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
	if (!admin && !phone) {
		throw new BookingError('Please enter your phone number. You’ll need it if you want to cancel.');
	}
	if (admin && cleanText(input.phone, 40) && !phone) {
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
	}

	return { date, start, end, name, phone, note: cleanText(input.note, 200) || null, kind };
}

export function createBooking(input: BookingInput, admin: boolean): AdminSlot {
	const v = validate(input, admin);

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
				`INSERT INTO bookings (date, start, end, name, phone, note, kind, created_by)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
			)
			.get(v.date, v.start, v.end, v.name, v.phone, v.note, v.kind, admin ? 'admin' : 'public') as {
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

/**
 * Cancels one slot. Members of the public must give the phone number the
 * booking was made with; the post office can cancel anything.
 */
export function cancelSlot(id: string, opts: { admin: boolean; phone?: unknown }): AdminSlot {
	const date = id.startsWith('s') ? id.split(':')[1] : null;
	let slot: AdminSlot | undefined;
	if (id.startsWith('b')) {
		const row = db.query('SELECT date FROM bookings WHERE id = ?').get(Number(id.slice(1))) as {
			date: string;
		} | null;
		if (row) slot = getAdminSlots(row.date, row.date).find((s) => s.id === id);
	} else if (date && isValidDate(date)) {
		slot = getAdminSlots(date, date).find((s) => s.id === id);
	}
	if (!slot) throw new BookingError('That booking has already been cancelled.');

	if (!opts.admin) {
		if (slot.kind === 'block') throw new BookingError('Only the post office can change this.');
		if (!slot.phone) {
			throw new BookingError(
				'This booking was made at the post office. Please ask them to cancel it.'
			);
		}
		const now = nowUK();
		if (slot.date < now.date || (slot.date === now.date && slot.end <= now.minutes)) {
			throw new BookingError('This booking has already finished.');
		}
		const phone = normalisePhone(opts.phone);
		if (!phone || phone !== slot.phone) {
			throw new BookingError('That phone number doesn’t match the one used to make this booking.');
		}
	}

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
