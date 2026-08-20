# 🛰️ OwnPulse
### **The Ultimate Pilot Tool for Solopreneurs: Social CRM, Marketing, and Financial Intelligence**

![OwnPulse Pipeline](assets/ownpulse-pipeline.jpg)
![OwnPulse Marketing Dashboard](assets/ownpulse-marketing-dashboard.jpg)
![OwnPulse Tasks](assets/ownpulse-tasks.jpg)

*Built by [Cedric V.](https://cedricv.com/en/) — architecting lightweight, sovereign systems for modern entrepreneurs.*

---

**OwnPulse** is the **ultimate tool for solopreneurs to pilot their business**. It provides a centralized, private view of your business growth and health, bridging the gap between **lead acquisition**, **marketing performance**, and **financial sustainability**.

---

## ✨ Core Pillars

### 1. ⚡ Sovereign Social CRM
- **Smart Capture:** Instantly save leads from **LinkedIn, Threads, and Instagram** via the dedicated Chrome Extension.
- **Pipeline Management:** Move leads through custom stages with a high-velocity, debounced interface.
- **Bi-directional Linking:** Connect sales directly to contacts for a 360° view of customer history.
- **Duplicate Merge:** Merge accidentally duplicated leads from the contact page or by multi-selecting rows in the leads table — fields, lists, notes, tasks, sales, and activities are consolidated and duplicates removed.

### 2. 📊 Marketing & Offer Intelligence
- **Acquisition Analysis:** Track exactly which social channels are driving your customers.
- **Conversion Velocity:** Measure the *time-to-conversion* from first contact to first sale.
- **Offer Mastery:** Manage complex service offers with integrated work-time calculators and automatic margin tracking.
- **Profitability Dashboard:** Visualize real vs. theoretical hourly rates and sales goals progress per offer.
- **Retention Tracking:** Visualize returning vs. new customer ratios to optimize long-term growth.

### 3. 💰 Financial Command (CFO Dashboard)
- **Revenue vs. Reality:** Track total sales against professional expenses and **actual remuneration**.
- **Net Profit Simulation:** Real-time visibility into your *true* margin after social contributions and taxes.
- **Runway Analysis:** Know exactly how many months of operation you have left based on current cash flow.

## 🛠️ Tech Stack

> 📋 **Sécurité & restes à faire** : voir [SECURITY.md](SECURITY.md) (état vérifié, rotation de clé, test multi-utilisateur, MFA…).
- **Frontend/Backend:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL, Real-time sync, Row-Level Security)
- **Styling & Components:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **i18n:** Custom localized experience (FR/EN) with persistent settings.
- **Extension:** Chrome Manifest V3 for secure DOM scraping.
---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
1. Create a free project on [Supabase](https://supabase.com).
2. Execute the SQL schema found in `/supabase/schema.sql` to initialize your `contacts`, `companies`, and `tasks` tables (already security-hardened: RLS owner-scoped, anonymous access limited to `contact_urls` view + `capture_contact` RPC).
3. Run the incremental migrations in order: `fix_missing_tables.sql`, `migration_social_fields.sql`, `migration_marketing_cfo.sql`, `migration_acquisition_channels.sql`, `migration_offers_enhancement.sql`, `add_tax_social_settings.sql`, `add_vat_setting.sql`, `migration_sales_company_link.sql`, `migration_sales_quantity_decimal.sql`, `migration_contact_activities.sql`, `migration_merge_contacts.sql` (and `supabase/seed_generic.sql` for neutral demo data).
4. Retrieve your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
5. Disable public signup: **Authentication > Providers > Email > "Allow new users to sign up" = OFF**, and enable 2FA/MFA on your account.

⚠️ **Never re-run `schema.sql` or the migrations on an existing project** — they are initialization scripts. Existing projects are updated with `hardening_security_rls.sql` and `hardening_multi_user_rls.sql` instead.

Note: Supabase's Data API no longer exposes newly created `public` tables automatically by default on new projects starting May 30, 2026. Keep explicit `GRANT` statements alongside each `CREATE TABLE` migration.

**Security hardening (required for GDPR/LPD):** new projects are already hardened by `schema.sql` (see above). *Existing* projects: run `hardening_security_rls.sql` then `hardening_multi_user_rls.sql` once. They revoke anonymous access to personal/financial data, add `user_id` ownership (multi-user), and expose only the minimal `contact_urls` view + `capture_contact` RPC for the extension. Then, in the Supabase dashboard:
- **Authentication > Providers > Email > "Allow new users to sign up" = OFF** (otherwise anyone can create an account and read all data).
- Enable **2FA/MFA** on your account.
- Rotate the anon key if it was ever shared outside the extension.

### 2. Web App Installation (Local)
1. Clone the repository.
2. Go to the dashboard directory: `cd dashboard`.
3. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Install and run:
   ```bash
   npm install
   npm run dev
   ```

### 3. Extension Installation
1. Go to `chrome://extensions/`.
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the `/extension` folder from this repository.
4. After updating the extension, click **Reload** on the OwnPulse extension and refresh the social profile tab so the new content script is loaded.
5. Update the extension's configuration (in `popup.js` or `content.js`) with your Supabase endpoint.

The extension reports **Already in CRM** when the profile URL is already captured. On the dashboard, search by the profile URL or username: the All Leads search includes LinkedIn, Threads, and Instagram URLs. If a profile is already present but not visible on the current page, it may be on another paginated results page.

### 4. Tooling Maintenance
- Keep `eslint` aligned with `eslint-config-next` compatibility, not simply with the latest ESLint major.
- If a new ESLint major is released before `eslint-config-next` fully supports it, keep the last compatible ESLint major in place.
- For this project, `npm run lint` must remain green before and after dependency upgrades; if `eslint` and `eslint-config-next` diverge, prefer keeping Next.js tooling compatibility first.
- Revisit ESLint major upgrades as a dedicated maintenance task after Next.js and `eslint-config-next` have published compatible releases.

**Dependency & security bots:**
- **[Renovate](https://github.com/apps/renovate) is the only dependency bot** on this repo (`renovate.json` at the repo root). It handles both regular updates and security-related bumps (GitHub Security Advisories), as `config:recommended` keeps it active across all manifests.
- **Dependabot is disabled**: no `.github/dependabot.yml` exists and GitHub's *Automated security fixes* setting is turned off, so Dependabot will not open PRs.
- Security-sensitive dependency floors live in `dashboard/package.json` `overrides` (e.g. `next`, `postcss`, `hono`, `@hono/node-server`, `sharp`, `fast-uri`, `body-parser`). When a new advisory affects a transitive dependency, bump the matching override floor to the patched version and verify with `npm audit` (target: `found 0 vulnerabilities`) + `npm run lint` + `npm run build`.

### 5. Security & Privacy (GDPR / LPD)

OwnPulse stores personal data (contacts, notes, finances) and business secrets (offers, rates). Baseline practices:
- **Data access**: the dashboard talks to Supabase only with the user session (`authenticated` role); RLS is the single enforcement point — keep policies aligned with `hardening_security_rls.sql`. The extension uses the publishable key and is restricted to the `capture_contact` RPC (whitelisted INSERT) + a minimal `contact_urls` view (no read of emails/phones/notes).
- **Multi-user**: if more than one account will ever use the app, run `hardening_multi_user_rls.sql` — every row gets a `user_id`, all tables are scoped to `auth.uid()`, and anonymous captures land as "unclaimed" contacts that the first editor claims. Current data is backfilled to the first created user.
- **No secret keys in the repo**: only publishable keys appear in `extension/content.js`; the `service_role` key must never be committed, used in the browser, or put in the extension.
- **Env vars**: copy `dashboard/.env.local.example` → `.env.local`; never commit `.env.local` (already gitignored).
- **HTTP headers**: `dashboard/next.config.ts` sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and disables the `X-Powered-By` banner.
- **Git hygiene**: gitleaks pre-commit hook (`.pre-commit-config.yaml`) blocks secret commits.

### 6. Prospecting workspace

The `/prospecting` workspace is designed for a configurable daily outreach goal (10 distinct leads by default). The goal can be changed under **Settings → General → Objectif quotidien de prospection**. It prioritizes the existing contact statuses `Warm`, `Interested`, and `Engaged` as the warm-to-hot queue; it does not introduce a duplicate temperature field. `contacts.notes`, `first_contact_date`, `acquisition_channel`, and the existing `tasks` table keep their original meanings.

The workflow is explicit: open the available channel, contact the person, then click **J’ai contacté cette personne** and confirm the channel actually used. Available outreach channels are MP LinkedIn, e-mail, WhatsApp, SMS, appel, MP Instagram, Threads, and autre. The quick actions open LinkedIn, e-mail, phone, WhatsApp, or SMS when the corresponding contact data is available.

Run `migration_contact_activities.sql` once on an existing project. It adds the owner-scoped `contact_activities` history for the outreach channel, outcome, and short note, including the `SMS` channel constraint. A follow-up entered from the workspace creates an existing-style task. Multiple activities for the same lead on one day count as one distinct person toward the daily goal.

### 7. Keep-Alive (Free Plan Anti-Pause)

On the Supabase free plan, projects are **paused after 7 days of inactivity**. A zero-cost **Cloudflare Worker** (`keepalive-worker/`) keeps the project active every 6 hours via cron, fully independent of repo activity and GitHub.

Each run sends two pings (belt-and-suspenders):
- **A real Postgres query** — `GET /rest/v1/contact_urls?select=id&limit=1` with the anon key: the unambiguous activity signal (REST API + Postgres engine), i.e. the most conservative guarantee against pausing.
- **The health endpoint fallback** — `GET /auth/v1/health` with the publishable key header (Supabase requires it): keeps the watcher green even if the table/view is renamed or its grants change.

**Deploy (one time, ~3 min):** paste each line separately:
1. `cd keepalive-worker`
2. `npx --yes wrangler@latest login` — authorize your Cloudflare account.
3. `echo "https://<project-ref>.supabase.co" | npx --yes wrangler@latest secret put SUPABASE_URL` — replace the URL (no trailing slash).
4. `echo "<publishable-anon-key>" | npx --yes wrangler@latest secret put SUPABASE_ANON_KEY` — anon key from Supabase dashboard > API.
5. `npx --yes wrangler@latest deploy` — deploys the worker and registers the cron trigger.

The `echo "..." |` form skips wrangler's interactive prompt, so the block is safe to copy-paste (inline `#` comments break interactive shells).

**Verify:** `curl "https://ownpulse-supabase-keepalive.<your-subdomain>.workers.dev/ping"` → `OK`. Scheduled runs are visible under **Workers & Pages > ownpulse-supabase-keepalive > Logs**.

**Caveat:** the ping view (default `contact_urls`, from `hardening_security_rls.sql`) must be exposed to `anon` with an explicit `GRANT` — new Supabase projects no longer expose `public` objects to the Data API by default (see AGENTS.md). If you need a different frequency, edit `[triggers] crons` in `keepalive-worker/wrangler.toml` and redeploy.

### 8. Merge duplicate leads

When the same person is captured twice (e.g. once via Instagram, once via LinkedIn), merge the duplicates from either place:
- **Contact page:** from the contact's detail page → **Quick Actions → Fusionner des contacts** (search the duplicate, then choose which record to keep).
- **Leads table:** on the home page, tick the checkboxes of the duplicate rows (2+), then **Fusionner** in the selection bar and choose the record to keep.

Run `migration_merge_contacts.sql` once on an existing project. It adds the `merge_contacts(p_primary_id, p_duplicate_ids)` RPC (SECURITY DEFINER, `authenticated` only):
- **Field policy:** the kept (primary) contact's non-empty values win; its empty fields are filled from the duplicate(s). Lists are unioned (case-insensitive dedup) and notes are appended with a `--- Fusionné depuis ... ---` trace marker.
- **Related records:** tasks, sales, and prospecting activities are re-attached to the kept contact; the duplicate row is deleted.
- **Ownership:** only contacts owned by the caller, or unclaimed rows (`user_id` NULL, anonymous extension captures), can be merged. The kept contact becomes claimed (`user_id = auth.uid()`).
- The merge runs in a single transaction: any validation error rolls everything back.

The dedup `contact_urls` view automatically stops listing the deleted duplicate's profile URLs, and the kept contact retains both profile URLs (LinkedIn + Instagram) so the extension will report **Already in CRM** for both.

---

## 📊 How it works
1. 📡 **Capture**: The Chrome extension scrapes the LinkedIn, Threads, or Instagram profile DOM securely.
2. ⚡ **Sync**: Data is sent instantly to your private Supabase PostgreSQL instance.
3. 🛰️ **Pulse**: Manage your relationships and pipeline stages via the OwnPulse dashboard.

---

## ⚖️ Legal Disclaimer

**IMPORTANT: READ THIS BEFORE USE.**
This project is for **educational and personal use only**. It is not affiliated with, authorized, maintained, sponsored, or endorsed by LinkedIn or its affiliates.
- **Compliance:** Using third-party extensions to modify platform behavior may violate Terms of Service of the respective platforms (LinkedIn, Threads, Instagram).
- **Risk:** Use this software at your own risk. The author is not responsible for any account warnings or suspensions.
- **No Warranty:** This software is provided "as is", without warranty of any kind.

---

## 📜 License
Distributed under the **BSD 3-Clause License**. See `LICENSE` for more information. This license protects the author's name from being used for endorsement of derivative works while allowing full freedom for personal and commercial use.
