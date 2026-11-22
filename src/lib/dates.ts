// Date helpers. Dates are plain "YYYY-MM-DD" strings and times are minutes
// since midnight, both in UK local time. We do arithmetic on UTC Date objects
// so daylight-saving changes never shift a booking.

export const TZ = 'Europe/London';

export type ISODate = string;

export function parseDate(d: ISODate): Date {
	const [y, m, day] = d.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, day));
}

export function toISO(d: Date): ISODate {
	return d.toISOString().slice(0, 10);
}

export function isValidDate(d: unknown): d is ISODate {
	if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
	return toISO(parseDate(d)) === d;
}

export function addDays(d: ISODate, n: number): ISODate {
	const date = parseDate(d);
	date.setUTCDate(date.getUTCDate() + n);
	return toISO(date);
}

/** 0 = Monday … 6 = Sunday */
export function weekday(d: ISODate): number {
	return (parseDate(d).getUTCDay() + 6) % 7;
}

export function startOfWeek(d: ISODate): ISODate {
	return addDays(d, -weekday(d));
}

export function weekDates(d: ISODate): ISODate[] {
	const start = startOfWeek(d);
	return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Current date and minute-of-day in the UK. */
export function nowUK(): { date: ISODate; minutes: number } {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(new Date());
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
	return {
		date: `${get('year')}-${get('month')}-${get('day')}`,
		minutes: Number(get('hour')) * 60 + Number(get('minute'))
	};
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts });

const longFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const longYearFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dayNameFmt = fmt({ weekday: 'long' });
const shortDayFmt = fmt({ weekday: 'short' });
const monthFmt = fmt({ month: 'long', year: 'numeric' });
const shortMonthFmt = fmt({ day: 'numeric', month: 'short' });

/** "Saturday 28 November" */
export function formatLong(d: ISODate, withYear = false): string {
	return (withYear ? longYearFmt : longFmt).format(parseDate(d));
}
export const dayName = (d: ISODate) => dayNameFmt.format(parseDate(d));
export const shortDay = (d: ISODate) => shortDayFmt.format(parseDate(d));
export const dayOfMonth = (d: ISODate) => parseDate(d).getUTCDate();
export const formatShort = (d: ISODate) => shortMonthFmt.format(parseDate(d));

/** "November 2026", or "November – December 2026" for a week spanning two months */
export function formatWeekRange(start: ISODate): string {
	const end = addDays(start, 6);
	const a = monthFmt.format(parseDate(start));
	const b = monthFmt.format(parseDate(end));
	if (a === b) return a;
	const [am, ay] = a.split(' ');
	const [bm, by] = b.split(' ');
	return ay === by ? `${am} – ${bm} ${by}` : `${a} – ${b}`;
}

export const DAY_NAMES = [
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
	'Sunday'
];

/** 750 -> "12:30" */
export function formatTime(m: number): string {
	const h = Math.floor(m / 60);
	const min = m % 60;
	return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function parseTime(s: unknown): number | null {
	if (typeof s !== 'string') return null;
	const match = /^(\d{1,2}):(\d{2})$/.exec(s);
	if (!match) return null;
	const h = Number(match[1]);
	const m = Number(match[2]);
	if (h > 24 || m > 59) return null;
	return h * 60 + m;
}

export function formatRange(start: number, end: number): string {
	return `${formatTime(start)} – ${formatTime(end)}`;
}

/** 90 -> "1½ hours" */
export function formatDuration(mins: number): string {
	const h = Math.floor(mins / 60);
	const half = mins % 60 === 30;
	if (h === 0) return '30 minutes';
	const label = `${h}${half ? '½' : ''}`;
	return `${label} ${h === 1 && !half ? 'hour' : 'hours'}`;
}

export const startOfMonth = (d: ISODate): ISODate => `${d.slice(0, 7)}-01`;

/** Same day of the month, n months on (clamped, so 31 Jan + 1 month = 28/29 Feb). */
export function addMonths(d: ISODate, n: number): ISODate {
	const date = parseDate(d);
	const day = date.getUTCDate();
	date.setUTCDate(1);
	date.setUTCMonth(date.getUTCMonth() + n);
	const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
	date.setUTCDate(Math.min(day, last));
	return toISO(date);
}

/** The six Monday-to-Sunday weeks shown for the month containing d. */
export function monthGrid(d: ISODate): ISODate[] {
	const start = startOfWeek(startOfMonth(d));
	return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** "November 2026" */
export const formatMonth = (d: ISODate) => monthFmt.format(parseDate(d));

export const isSameMonth = (a: ISODate, b: ISODate) => a.slice(0, 7) === b.slice(0, 7);
