# ☁️ Supabase Keep-Alive (Cloudflare Worker)

Keeps a free-tier Supabase project alive by pinging it every 6 hours via a
Cloudflare cron trigger. Supabase pauses projects after 7 days of inactivity;
this worker is fully independent of GitHub/repo activity and costs nothing on
the Cloudflare free plan (4 tiny requests/day).

## What it pings (hybrid, belt-and-suspenders)

1. **A real Postgres query via PostgREST** — `GET /rest/v1/contact_urls?select=id&limit=1`
   with the anon key. This is the conservative, unambiguous "activity" signal:
   it exercises both the REST API and the Postgres engine, which is the safest
   way to be counted as activity by the pause logic.
2. **The health endpoint** — `GET /auth/v1/health` (no key), as a fallback so
   the watcher stays green even if the table is renamed or its grants change.

## Deploy

Paste each line separately in your terminal (the `echo |` form avoids the
interactive prompt — inline `#` comments are not treated as comments by
interactive shells):

```bash
cd keepalive-worker
npx --yes wrangler@latest login

echo "https://<project-ref>.supabase.co" | npx --yes wrangler@latest secret put SUPABASE_URL

echo "<publishable-anon-key>" | npx --yes wrangler@latest secret put SUPABASE_ANON_KEY

npx --yes wrangler@latest deploy
```

> Both values are stored as encrypted Cloudflare secrets, never in the repo.
> The anon key is a publishable key (it already lives in the Chrome
> extension), so this is not a security risk. The `.wrangler/` local cache
> created by wrangler is gitignored.

## Requirements & caveats

- The ping view (`KEEPALIVE_TABLE`, default `contact_urls` from
  `hardening_security_rls.sql`) must exist **and be
  exposed to the `anon` role**: new Supabase projects no longer expose `public`
  tables to the Data API by default (since May 30, 2026), so keep the explicit
  `GRANT` statements alongside each `CREATE TABLE`.
- RLS is not a problem: a fully filtered result still returns `200 []`, which
  counts as a successful ping.
- If the table returns `404`, the worker logs it and still reports `OK` via
  the health-endpoint fallback — but you should fix the grant.

## Verify

```bash
curl "https://ownpulse-supabase-keepalive.<your-subdomain>.workers.dev/ping"
# → OK (HTTP 200) | FAILED (HTTP 502)
```

Scheduled runs and logs are visible under **Workers & Pages →
ownpulse-supabase-keepalive → Logs** in the Cloudflare dashboard.

## Tune the frequency

Edit `[triggers] crons` in `wrangler.toml` (cron syntax, UTC) and redeploy:

```toml
[triggers]
crons = ["0 */6 * * *"]   # every 6 hours — plenty vs. the 7-day pause window
```

## Files

- `wrangler.toml` — worker config, cron trigger, `KEEPALIVE_TABLE` var
- `src/index.js` — scheduled handler (cron) + `GET /ping` manual trigger
