<img src="assets/icon.svg" width="64" height="64" alt="">

# Tennis court bookings

A simple booking calendar for the village tennis court. Nobody needs an account: people
tap a free time, type their name and phone number, and it's booked. The same phone number
is needed to cancel. The post office has its own page with full control.

## What it does

**For everyone** (`/`)

- Google Calendar–style week view on computers, day view with a day picker on phones
- Tap a free half hour to book: 30 min, 1 h, 1½ h, 2 h, or a custom finish time (up to 6 hours)
- Cancel your own booking by tapping it and entering the phone number you booked with
- Name and number are remembered on the device; bookings made on the device are highlighted
- Phone numbers are never sent to the public page

**Post office** (`/post-office`, one shared password)

- Book any time for anyone (phone number optional; without one, only the post office can cancel)
- Regular weekly bookings, e.g. “John, every Saturday 12:00–13:00”, with an optional end date.
  Weeks already booked are skipped automatically.
- Cancel one week of a regular booking, or stop it from a date onwards
- Block out the court (maintenance, coaching, matches), one-off or weekly
- Notice banner at the top of the site, help/contact message, opening hours, site name
- Find upcoming bookings by name or phone number
- Activity log of every booking, cancellation and change

## Running locally

```sh
bun install
bun run dev
```

The post office password defaults to `postoffice` when `ADMIN_PASSWORD` isn't set.
Data is stored in `./data/tennis.db` (SQLite).

## Deploying on Coolify

1. Create a new resource from this Git repo, using the **Dockerfile** (or **Docker Compose**) build pack.
2. Set the environment variable `ADMIN_PASSWORD` to the post office password.
3. Add a persistent volume mounted at **`/data`**. This is where the bookings database lives.
   Without it, bookings are lost on every redeploy.
4. The app listens on port **3000**. Health check: `GET /health`.

If saving a booking fails with “Cross-site POST form submissions are forbidden”, set
`ORIGIN` to your public address, e.g. `ORIGIN=https://tennis.example.org`.

| Variable         | Default              |                                                        |
| ---------------- | -------------------- | ------------------------------------------------------ |
| `ADMIN_PASSWORD` | `postoffice`         | Post office password. Changing it logs everyone out.   |
| `DATABASE_PATH`  | `/data/tennis.db`    | SQLite file location                                   |
| `ORIGIN`         | (from proxy headers) | Public URL, if the proxy headers aren't passed through |
| `PORT`           | `3000`               |                                                        |

**Backups:** copy `/data/tennis.db` (plus `tennis.db-wal` if present), or use Coolify's volume backups.

## Tech

SvelteKit 3 (Svelte 5) on Bun, `bun:sqlite`, Tailwind 4, shadcn-svelte (restyled), Atkinson Hyperlegible font.
