// Starts the built app. Coolify gives the public address as SERVICE_URL_APP
// ("https://tennis.example.org") and SERVICE_FQDN_APP ("tennis.example.org"); this
// turns it into ORIGIN, so the app knows its own address behind Cloudflare and
// Coolify's proxy. An ORIGIN set by hand always wins.

/** The first address in a (possibly comma-separated) value, as "https://host[:port]". */
function toOrigin(value) {
	const first = value?.split(',')[0].trim();
	if (!first) return null;
	try {
		return new URL(/^https?:\/\//.test(first) ? first : `https://${first}`).origin;
	} catch {
		return null;
	}
}

if (!process.env.ORIGIN) {
	const origin = toOrigin(process.env.SERVICE_URL_APP) ?? toOrigin(process.env.SERVICE_FQDN_APP);
	if (origin) {
		process.env.ORIGIN = origin;
		console.log(`[tennis] Using ${origin} as the public address`);
	} else if (process.env.NODE_ENV === 'production') {
		console.warn(
			'[tennis] ORIGIN is not set, so the address is worked out from proxy headers. Set ORIGIN to the public address, e.g. https://tennis.example.org'
		);
	}
}

await import('./build/index.js');
