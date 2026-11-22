import { db } from '#lib/server/db.js';

export function GET() {
	db.query('SELECT 1').get();
	return new Response('ok');
}
