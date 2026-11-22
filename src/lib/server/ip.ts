import type { RequestEvent } from '@sveltejs/kit';

/**
 * The header holding the visitor's real address. Behind Cloudflare this is
 * "cf-connecting-ip": Cloudflare always overwrites it, so visitors can't fake it
 * (as long as the server only accepts traffic from Cloudflare). Without it, every
 * request seems to come from the proxy in front of the app.
 */
const header = (process.env.CLIENT_IP_HEADER ?? '').trim().toLowerCase();

export function clientIp(event: Pick<RequestEvent, 'request' | 'getClientAddress'>): string {
	const forwarded = header && event.request.headers.get(header)?.split(',')[0].trim();
	if (forwarded) return forwarded.slice(0, 64);
	try {
		return event.getClientAddress() || 'unknown';
	} catch {
		return 'unknown';
	}
}
