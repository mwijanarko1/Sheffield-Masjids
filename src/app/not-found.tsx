import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="relative z-10 flex min-h-[100svh] items-center justify-center px-5 py-20 text-[var(--theme-fg,#fff)]">
      <div className="max-w-xl rounded-[22px] border border-white/20 bg-white/15 p-8 text-center shadow-xl backdrop-blur-xl sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#47A6FF]">
          404
        </p>
        <h1 className="mt-3 text-3xl font-light sm:text-5xl">Page not found</h1>
        <p className="mt-5 leading-7 opacity-80">
          This Sheffield Masjids page does not exist. Return to today&apos;s prayer times or browse the available mosque timetables.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold">
          <Link href="/" className="text-[#2E8DFF] underline underline-offset-4">
            Today&apos;s prayer times
          </Link>
          <Link href="/timetable" className="text-[#2E8DFF] underline underline-offset-4">
            Mosque timetables
          </Link>
          <Link href="/sitemap.xml" className="text-[#2E8DFF] underline underline-offset-4">
            Sitemap
          </Link>
        </div>
      </div>
    </main>
  );
}
