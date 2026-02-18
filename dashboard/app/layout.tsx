
import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { LanguageProvider } from "@/components/i18n/language-context";

export const metadata: Metadata = {
  title: "OwnPulse",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-sans">
        <LanguageProvider>
          <div className="flex h-screen bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto w-full">
              {children}
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
