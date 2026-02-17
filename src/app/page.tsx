import HomeContent from "@/components/HomeContent";

export default function Home() {
  return (
    <main className="min-h-[100dvh] sm:min-h-screen bg-[var(--theme-bg)] dark:bg-[var(--theme-bg-dark)]">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 sm:px-6 lg:px-8 pb-safe">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Sheffield Masjids
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Prayer times, locations, and links for mosques across Sheffield.
          </p>
        </header>

        <HomeContent />

        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500 text-xs sm:text-sm">
          <p>© {new Date().getFullYear()} Sheffield Masjids</p>
        </footer>
      </div>
    </main>
  );
}
