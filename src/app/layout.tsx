import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sheffield Masjids | Prayer Timetables",
  description: "Prayer times and mosque locations across Sheffield.",
  keywords: ["Sheffield", "Masjid", "Mosque", "Prayer Times", "Salah", "Islam"],
  authors: [{ name: "Sheffield Masjids" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--theme-bg)] dark:bg-[var(--theme-bg-dark)] text-gray-900 dark:text-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}
