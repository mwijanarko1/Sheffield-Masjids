import type { Metadata } from "next";
import HomeContent from "@/components/HomeContent";
import { getMosques } from "@/lib/mosques";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const mosques = await getMosques();

  return (
    <main className="min-h-[100dvh] bg-background sm:min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-safe sm:px-6 sm:py-8 lg:px-8 xl:max-w-7xl">
        <HomeContent mosques={mosques} />

        <footer className="mt-12 flex flex-row items-center justify-between gap-4 border-t border-border py-6 text-xs text-muted-foreground sm:text-sm">
          <p className="m-0">© {new Date().getFullYear()} Sheffield Masjids</p>
          <p className="m-0">
            Made by{" "}
            <a
              href="https://mikhailwijanarko.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)] transition-colors"
            >
              mikhailbuilds
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
