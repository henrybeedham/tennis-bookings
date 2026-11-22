import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const path = process.env.DATABASE_PATH || './data/tennis.db';
mkdirSync(dirname(path), { recursive: true });

export const db = new Database(path, { create: true, strict: true });

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS bookings (
	id INTEGER PRIMARY KEY,
	date TEXT NOT NULL,
	start INTEGER NOT NULL,
	end INTEGER NOT NULL,
	name TEXT NOT NULL,
	phone TEXT,
	note TEXT,
	kind TEXT NOT NULL DEFAULT 'booking',
	created_by TEXT NOT NULL DEFAULT 'public',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	ip TEXT
);
CREATE INDEX IF NOT EXISTS bookings_date ON bookings(date);

CREATE TABLE IF NOT EXISTS series (
	id INTEGER PRIMARY KEY,
	weekday INTEGER NOT NULL,
	start INTEGER NOT NULL,
	end INTEGER NOT NULL,
	start_date TEXT NOT NULL,
	end_date TEXT,
	name TEXT NOT NULL,
	phone TEXT,
	note TEXT,
	kind TEXT NOT NULL DEFAULT 'booking',
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS series_skips (
	series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
	date TEXT NOT NULL,
	PRIMARY KEY (series_id, date)
);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS log (
	id INTEGER PRIMARY KEY,
	at TEXT NOT NULL DEFAULT (datetime('now')),
	action TEXT NOT NULL,
	detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY,
	role TEXT NOT NULL,
	expires_at INTEGER NOT NULL
);

-- A slow hash of each password, so a changed password can log out old sessions.
CREATE TABLE IF NOT EXISTS auth_passwords (
	role TEXT PRIMARY KEY,
	salt TEXT NOT NULL,
	hash TEXT NOT NULL
);
`);

// Databases made before bookings remembered the address they were made from.
const bookingColumns = db.query('PRAGMA table_info(bookings)').all() as { name: string }[];
if (!bookingColumns.some((c) => c.name === 'ip'))
	db.exec('ALTER TABLE bookings ADD COLUMN ip TEXT;');
db.exec('CREATE INDEX IF NOT EXISTS bookings_ip ON bookings(ip);');
