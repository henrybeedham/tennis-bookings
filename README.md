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

**Superadmin** (`/superadmin`, its own password, not linked from anywhere)

- Upcoming public bookings grouped by the internet address they were made from
- Delete every upcoming booking from one address, to clear out spam
- Addresses are forgotten 30 days after the booking

**Security**

- Wrong passwords: 5 per address and 50 in total every 15 minutes, then logins pause
- Wrong phone numbers when cancelling: 10 per address every 15 minutes, 20 per booking a day
- Logins are stored on the server and end on log out (post office after 30 days, superadmin after 8 hours)
- Public bookings need a full phone number (at least 10 digits)
- Not indexed by search engines (`robots.txt`, `X-Robots-Tag` and a `noindex` meta tag)

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

The app needs to know its public address. On Coolify this is automatic: it uses
`SERVICE_URL_APP` (or `SERVICE_FQDN_APP`), which Coolify fills in from the domain you give the
app. Anywhere else, set `ORIGIN`, e.g. `ORIGIN=https://tennis.example.org`. Without it the
address is worked out from proxy headers, saving can fail with “Cross-site POST form
submissions are forbidden”, and login cookies may not be marked secure.

### Behind Cloudflare

- Visitor addresses come from Cloudflare's `CF-Connecting-IP` header. Cloudflare overwrites
  it, but anyone who reaches the server directly can fake it. So only let Cloudflare reach the
  server: firewall ports 80/443 to [Cloudflare's IP ranges](https://www.cloudflare.com/ips/),
  or use a Cloudflare Tunnel.
- Use SSL mode **Full (strict)**, and turn off **Rocket Loader**: it rewrites scripts, and the
  Content-Security-Policy blocks that.

| Variable              | Default                                                 |                                                                         |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ADMIN_PASSWORD`      | `postoffice`                                            | Post office password. Changing it logs everyone out.                    |
| `SUPERADMIN_PASSWORD` | (off)                                                   | Turns on `/superadmin`. 12+ characters, different from `ADMIN_PASSWORD` |
| `CLIENT_IP_HEADER`    | `cf-connecting-ip` (Docker)                             | Header with the visitor's address. Empty = the connection's address     |
| `DATABASE_PATH`       | `/data/tennis.db`                                       | SQLite file location                                                    |
| `ORIGIN`              | `SERVICE_URL_APP`, else `https://` + `SERVICE_FQDN_APP` | Public URL. Set it by hand to override Coolify's                        |
| `PORT`                | `3000`                                                  |                                                                         |

**Link previews:** sharing the link in iMessage, WhatsApp and so on shows `static/og.jpg`. Its
design is `assets/og/og-image.html`; after changing it, run `assets/og/render.sh` and bump `?v=` in
`src/routes/+page.svelte` so apps fetch the new one.

**Backups:** copy `/data/tennis.db` (plus `tennis.db-wal` if present), or use Coolify's volume backups.

## Tech

SvelteKit 3 (Svelte 5) on Bun, `bun:sqlite`, Tailwind 4, shadcn-svelte (restyled), Atkinson Hyperlegible font.
