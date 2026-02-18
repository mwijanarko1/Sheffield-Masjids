import Link from "next/link";
import { notFound } from "next/navigation";
import MonthlyTimetable from "@/components/MonthlyTimetable";
import { Button } from "@/components/ui/button";
import mosquesData from "../../../../../public/data/mosques.json";
import { Mosque } from "@/types/prayer-times";

interface TimetablePageProps {
  params: Promise<{
    slug: string;
  }>;
}

const HIDDEN_MOSQUES = ["sheffield-grand-mosque"];

export default async function TimetablePage({ params }: TimetablePageProps) {
  const { slug } = await params;
  if (HIDDEN_MOSQUES.includes(slug)) {
    notFound();
  }

  const mosque = mosquesData.mosques.find((m: Mosque) => m.slug === slug);
  if (!mosque) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] bg-background sm:min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 sm:px-6 lg:px-8 pb-safe">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="link" asChild className="h-auto p-0 text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)]">
            <Link href="/">Back to home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/mosques/${mosque.slug}`}>Live prayer view</Link>
          </Button>
        </div>

        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {mosque.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Full monthly timetable
          </p>
        </header>

        <MonthlyTimetable mosque={mosque} />
      </div>
    </main>
  );
}
