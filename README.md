# 🛰️ OwnPulse
### **The Ultimate Pilot Tool for Solopreneurs: Social CRM, Marketing, and Financial Intelligence**

![OwnPulse Pipeline](assets/ownpulse-pipeline.jpg)
![OwnPulse Marketing Dashboard](assets/ownpulse-marketing-dashboard.jpg)
![OwnPulse Tasks](assets/ownpulse-tasks.jpg)

*Built by [Cedric V.](https://cedricv.com/en/) — architecting lightweight, sovereign systems for modern entrepreneurs.*

---

**OwnPulse** is the **ultimate tool for solopreneurs to pilot their business**. It provides a centralized, private view of your growth and health, bridging the gap between **lead acquisition**, **marketing performance**, and **financial sustainability**.

---

## ✨ Core Pillars

### 1. ⚡ Sovereign Social CRM
- **Smart Capture:** Instantly save leads from **LinkedIn, Threads, and Instagram** via the dedicated Chrome Extension.
- **Pipeline Management:** Move leads through custom stages with a high-velocity, debounced interface.
- **Bi-directional Linking:** Connect sales directly to contacts for a 360° view of customer history.

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
- **Frontend/Backend:** [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL, Real-time sync, Row-Level Security)
- **Styling & Components:** [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)
- **i18n:** Custom localized experience (FR/EN) with persistent settings.
- **Extension:** Chrome Manifest V3 for secure DOM scraping.
---

## 🚀 Getting Started

### 1. Database Setup (Supabase)
1. Create a free project on [Supabase](https://supabase.com).
2. Execute the SQL schema found in `/supabase/schema.sql` to initialize your `contacts`, `companies`, and `tasks` tables.
3. Retrieve your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. *Existing users:* If you are upgrading from a version before Threads/Instagram support, run `migration_social_fields.sql`.

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
4. Update the extension's configuration (in `popup.js` or `content.js`) with your Supabase endpoint.

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
