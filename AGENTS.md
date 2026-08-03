# AGENTS.md

## Purpose
This repository contains OwnPulse:
- a Next.js 16 dashboard in `dashboard/`
- a Chrome extension in `extension/`
- SQL bootstrap and migration scripts for Supabase in the repo root and `supabase/`

Use this file as the project-specific operating guide before making changes.

## Repository Layout
- `dashboard/`: main app, App Router, Supabase auth/session handling, UI components
- `extension/`: Chrome extension that captures profile data and writes to Supabase
- `supabase/schema.sql`: base schema for core tables
- `*.sql` at repo root: incremental migrations and setup patches
- `README.md`: user-facing setup and maintenance notes

## Primary Commands
- Install root helper package metadata: `npm install`
- Install dashboard dependencies: `cd dashboard && npm install`
- Run dashboard locally: `cd dashboard && npm run dev`
- Lint dashboard: `cd dashboard && npm run lint`
- Build dashboard: `cd dashboard && npm run build`

Always run `npm run lint` and `npm run build` in `dashboard/` after meaningful app or dependency changes.

## Supabase Rules
- The app uses Supabase Data API access through `supabase-js` and direct REST calls from the extension.
- New tables created in `public` must include explicit `GRANT` statements. Do not rely on default Data API exposure.
- Keep RLS and grants aligned with actual callers:
  - dashboard uses `authenticated` and session-backed access, scoped by `user_id` (multi-user ready)
  - extension uses `anon` access limited to the `contact_urls` view (URL dedup) and the `capture_contact` RPC (whitelisted insert)
- `schema.sql` is a **hardened bootstrap for new projects only** — never re-run it on an existing project (its older versions re-opened anonymous access). Existing projects use `hardening_security_rls.sql` + `hardening_multi_user_rls.sql`.
- The anti-pause watchdog (`keepalive-worker/`, Cloudflare cron) pings `contact_urls` via the anon key. Keep an explicit `GRANT SELECT ON contact_urls TO anon` — if that grant is removed or the view is renamed, the keep-alive falls back to `/auth/v1/health` and logs the 404.
- When changing schema or access patterns, update both SQL and documentation.

## Extension Rules
- `extension/content.js` calls `/rest/v1/contact_urls` for dedup and `/rest/v1/rpc/capture_contact` for inserts, with the publishable key.
- Anonymous access is intentionally locked down: no direct SELECT/INSERT on `contacts` with the anon key (personal data exposure risk). Keep this invariant — any future change must preserve the extension flow via `contact_urls` + `capture_contact`.
- Prefer a server-mediated or authenticated extension flow for future hardening, but do not partially migrate it without updating the full path.

## Tooling Policy
- Keep `eslint` compatible with `eslint-config-next`. Do not force the newest ESLint major unless Next.js tooling supports it cleanly.
- Current intentional state:
  - `next`: `^16.2.6`
  - `eslint-config-next`: `^16.2.6`
  - `eslint`: `^9.39.4`
- If testing a new ESLint major, verify `npm run lint` before keeping the upgrade.
- Dependency freshness matters, but build and lint stability take priority over chasing every new major immediately.

## UI / Frontend Expectations
- Preserve the existing design language unless the task explicitly asks for redesign.
- Prefer updating existing components in `dashboard/components/ui/` and existing patterns before introducing new abstractions.
- Keep mobile behavior intact when changing dashboard pages.

## Change Discipline
- Do not edit generated or vendored files in `node_modules/`.
- Prefer targeted changes over broad refactors.
- If you modify schema, auth, or dependency versions, also update the relevant docs in `README.md`.
- If a task touches security, grants, auth, or dependency upgrades, validate the result instead of stopping at code edits.

## Known Project-Specific Risks
- GitHub Dependabot may still report vulnerabilities after local upgrades; verify whether they are production, dev-only, or transitive before making disruptive changes.
- Next.js build may warn about multiple lockfiles in parent directories. Treat this as an environment warning unless the task is specifically about workspace/tooling cleanup.
- The extension contains project-specific Supabase endpoint configuration. Treat those values as sensitive operational config even if they are publishable keys.
