import type { ISODate } from './dates';

export type SlotKind = 'booking' | 'block';

/** One thing on the calendar: a one-off booking, a week of a regular booking, or a block-out. */
export interface Slot {
	/** "b12" for one-off bookings, "s3:2026-11-28" for an occurrence of a regular booking */
	id: string;
	/**
	 * The id plus when it was made. Database ids can be handed out again after a booking is
	 * deleted, so this is what a device uses to remember which bookings it made.
	 */
	ref: string;
	date: ISODate;
	start: number;
	end: number;
	name: string;
	note: string | null;
	kind: SlotKind;
	recurring: boolean;
	/** Whether a phone number was given, which means the person can cancel it themselves */
	cancellable: boolean;
}

/** Extra details only the post office sees. */
export interface AdminSlot extends Slot {
	phone: string | null;
	createdBy: 'public' | 'admin';
	createdAt: string;
	seriesId: number | null;
}

export interface Series {
	id: number;
	weekday: number;
	start: number;
	end: number;
	startDate: ISODate;
	endDate: ISODate | null;
	name: string;
	phone: string | null;
	note: string | null;
	kind: SlotKind;
}

export interface Settings {
	title: string;
	open: number;
	close: number;
	notice: string;
	contact: string;
}

export interface LogEntry {
	id: number;
	at: string;
	action: string;
	detail: string;
}
