
import type { Metadata } from "next";
import "./globals.css";
import { MobileSidebar, Sidebar } from "@/components/sidebar";
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
          <div className="min-h-dvh bg-slate-50">
            <MobileSidebar />
            <div className="flex min-h-[calc(100dvh-4rem)] md:min-h-dvh">
              <Sidebar />
              <main className="min-w-0 flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
