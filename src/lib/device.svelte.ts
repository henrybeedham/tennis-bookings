// Remembers things on this phone or computer only, so people don't have to
// type their details every time. Nothing here is needed for the site to work.

const ME_KEY = 'tb:me';
const MINE_KEY = 'tb:mine';

function read<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

class Device {
	name = $state('');
	phone = $state('');
	mine = $state(new Set<string>());

	load() {
		const me = read<{ name?: string; phone?: string }>(ME_KEY, {});
		this.name = me.name ?? '';
		this.phone = me.phone ?? '';
		this.mine = new Set(read<string[]>(MINE_KEY, []));
	}

	remember(name: string, phone: string) {
		this.name = name;
		this.phone = phone;
		write(ME_KEY, { name, phone });
	}

	addMine(id: string) {
		this.mine = new Set([...this.mine, id].slice(-200));
		write(MINE_KEY, [...this.mine]);
	}

	removeMine(id: string) {
		const next = new Set(this.mine);
		next.delete(id);
		this.mine = next;
		write(MINE_KEY, [...next]);
	}
}

export const device = new Device();
