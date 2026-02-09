# Cedric's CRM (Vibe CRM)

A minimalist CRM built for personal lead management, focusing on LinkedIn prospecting.

## 🚀 Features
- **LinkedIn Extension**: Scrape profiles directly from LinkedIn and add them to your CRM.
- **Next.js Dashboard**: Manage leads, take notes, and track your pipeline.
- **Pipeline View**: Kanban board to track lead stages (Engaged, Warm, etc.).
- **Supabase Backend**: Secure PostgreSQL database with Row Level Security (RLS).

## 🛠 Tech Stack
- **Frontend**: Next.js, Shadcn UI, Tailwind CSS.
- **Backend**: Supabase.
- **Extension**: Chrome Manifest V3 (Vanilla JS).

## 📂 Project Structure
- `/dashboard`: Next.js web application.
- `/extension`: Chrome extension source code.
- `/scripts`: Data import and cleanup utilities.
- `/docs`: Documentation and SQL schemas.

## 🛡 Security
This project uses **Supabase Auth** and **RLS policies** to ensure data is restricted to the authenticated owner.

## 📄 License
MIT
# Trigger
