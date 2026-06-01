import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RyLis — Ryan & Lisa",
  description: "Productivity, relationship, and shared resources for the RyLis family.",
  applicationName: "RyLis",
  appleWebApp: { title: "RyLis", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#db2777",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
