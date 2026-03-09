import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import DynamicBackground from "@/components/DynamicBackground";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import {
  getBaseUrl,
  MOSQUE_NAMES,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/site";
import { ConvexProvider } from "@/providers/ConvexProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Sheffield mosque prayer times",
    "Sheffield masjid prayer times",
    "prayer times Sheffield",
    "iqamah times Sheffield",
    "Sheffield",
    "Masjid",
    "Mosque",
    "Prayer Times",
    "Iqamah Times",
    "Salah",
    "Islam",
    ...MOSQUE_NAMES,
    ...MOSQUE_NAMES.map((n) => `${n} prayer times`),
  ],
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1128" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-foreground">
        <ConvexProvider>
          <DynamicBackground />
          <a
            href="#main-content"
            className="absolute -left-[9999px] top-4 z-[100] rounded bg-[#FFB380] px-4 py-2 font-medium text-[#0A1128] focus:left-4 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0A1128]"
          >
            Skip to main content
          </a>
          <div
            id="main-content"
            tabIndex={-1}
            className="relative z-10 h-[100dvh] overflow-hidden"
          >
            {children}
          </div>
          <FloatingTabBar />
        </ConvexProvider>
        <Analytics />
      </body>
    </html>
  );
}
