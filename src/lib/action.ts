import { page } from '$app/state';

/**
 * The URL for a form action that keeps the week currently on screen
 * (e.g. "/?date=2026-11-26&/book"), so the calendar doesn't jump after saving.
 */
export function actionUrl(name: string, pathname = page.url.pathname): string {
	const date = page.url.searchParams.get('date');
	return `${pathname}?${date ? `date=${encodeURIComponent(date)}&` : ''}/${name}`;
}
