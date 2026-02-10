# OwnPulse Dashboard

The core management interface for OwnPulse. Built with Next.js for speed, security, and a premium "Vibe" experience.

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

4. **Run Locally**:
   ```bash
   npm run dev
   ```

## ✨ Premium Features

- **Modern Auto-Save UX**: Changes are automatically saved with real-time feedback (Debounced auto-save).
- **Multi-List Support**: Assign leads to multiple categories simultaneously (Customers, Prospects, etc.).
- **Direct Lead Entry**: Add leads manually from the dashboard without needing the extension.
- **CSV Export**: One-click export of your filtered/search results.
- **SSR Optimized**: Built with Next.js App Router for maximum performance and SEO.

## 🛡 Security

Data access is controlled via **Supabase Row Level Security (RLS)**. Ensure you have enabled RLS and applied the policies from the schema file before deploying.

---
Part of the [OwnPulse](../README.md) project.
