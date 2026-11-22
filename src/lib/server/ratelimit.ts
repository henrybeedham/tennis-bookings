/**
 * Counts failures per key (an IP address, a booking…) in a fixed time window.
 * Kept in memory: the app runs as a single process, and a restart forgetting
 * the counts is fine.
 */
export function limiter(max: number, windowMs: number) {
	const buckets = new Map<string, { count: number; reset: number }>();

	function prune(now: number) {
		for (const [key, b] of buckets) if (b.reset <= now) buckets.delete(key);
	}

	return {
		/** Whether this key has used up its attempts for now. */
		blocked(key: string): boolean {
			const b = buckets.get(key);
			return !!b && b.reset > Date.now() && b.count >= max;
		},
		hit(key: string) {
			const now = Date.now();
			let b = buckets.get(key);
			if (!b || b.reset <= now) {
				if (buckets.size > 10_000) prune(now);
				b = { count: 0, reset: now + windowMs };
				buckets.set(key, b);
			}
			b.count++;
		},
		clear(key: string) {
			buckets.delete(key);
		}
	};
}
