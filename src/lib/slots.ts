import type { ISODate } from './dates';
import type { Slot } from './types';

/** The first free half hour on a day (after now, if it's today). Falls back to opening time. */
export function firstFreeStart(
	slots: Slot[],
	day: ISODate,
	today: ISODate,
	nowMinutes: number,
	open: number,
	close: number
): number {
	const from = day === today ? Math.max(open, Math.floor(nowMinutes / 30) * 30) : open;
	const taken = slots.filter((s) => s.date === day);
	for (let m = from; m + 30 <= close; m += 30) {
		if (!taken.some((s) => s.start < m + 30 && s.end > m)) return m;
	}
	return open;
}
