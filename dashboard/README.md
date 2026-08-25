# OwnPulse Dashboard

The core management interface for OwnPulse. Built with Next.js 16 for speed, security, and a premium "Vibe" experience.

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Environment**:
   Copy `.env.local.example` to `.env.local` and add your Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Database Schema**:
   Apply the SQL schema found in [../supabase/schema.sql](../supabase/schema.sql) to your Supabase project.

   Note: newly created tables in Supabase `public` schema must include explicit `GRANT` statements if they need to stay accessible through the Data API.

4. **Run Locally**:
   ```bash
   npm run dev
   ```

   On an existing Supabase project, also apply `../migration_contact_activities.sql` before opening `/prospecting`.

5. **Validate Changes**:
   ```bash
   npm run lint
   npm run build
   ```

## ✨ Premium Features

- **Modern Auto-Save UX**: Changes are automatically saved with real-time feedback (Debounced auto-save).
- **Multi-List Support**: Assign leads to multiple categories simultaneously (Customers, Prospects, etc.).
- **Direct Lead Entry**: Add leads manually from the dashboard without needing the extension.
- **CSV Export**: One-click export of your filtered/search results.
- **Accent-insensitive search**: Contact, prospecting, company, task, and duplicate-merge searches ignore accents and case (`ecole` finds `école`).
- **Prospecting workspace**: Configurable daily outreach goal (10 by default), prioritizing existing `Warm`, `Interested`, and `Engaged` statuses without duplicating the contact temperature field. The workflow is: open a channel, contact the person, then confirm with **J’ai contacté cette personne**. Supported channels are MP LinkedIn, e-mail, WhatsApp, SMS, appel, MP Instagram, Threads, and autre. Outreach actions are stored in `contact_activities`; follow-ups use the existing `tasks` table. The contact detail page shows the complete prospecting history, and its **Enregistrer une action** button reuses the prospecting log panel with that contact preselected. Unknown first-contact/follow-up dates are displayed explicitly instead of appearing as today.
- **SSR Optimized**: Built with Next.js App Router for maximum performance and SEO.

## 🛡 Security

Data access is controlled via **Supabase Row Level Security (RLS)**. Ensure you have enabled RLS and applied the policies from the schema file before deploying.

## 🔧 Tooling

- Keep `eslint` compatible with `eslint-config-next`.
- Do not force a newer ESLint major unless `eslint-config-next` supports it cleanly in this project.
- When upgrading dependencies, prefer a passing `lint` and `build` over adopting every latest major immediately.

---
Part of the [OwnPulse](../README.md) project.
