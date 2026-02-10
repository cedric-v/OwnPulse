
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OwnPulse",
  description: "Advanced Agentic CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 bg-background">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
