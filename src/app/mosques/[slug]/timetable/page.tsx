import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MonthlyTimetable from "@/components/MonthlyTimetable";
import { Button } from "@/components/ui/button";
import { getMosqueBySlug } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

interface TimetablePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: TimetablePageProps): Promise<Metadata> {
  const { slug } = await params;
  const mosque = await getMosqueBySlug(slug);

  if (!mosque) {
    return { title: "Not Found" };
  }

  const title = `${mosque.name} Monthly Timetable`;
  const fullTitle = `${mosque.name} Monthly Timetable | ${SITE_NAME}`;
  const description = `Full monthly prayer times and iqamah times for ${mosque.name} in Sheffield.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/mosques/${mosque.slug}/timetable`,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: `/mosques/${mosque.slug}/timetable`,
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function TimetablePage({ params }: TimetablePageProps) {
  const { slug } = await params;
  const mosque = await getMosqueBySlug(slug);
  if (!mosque) {
    notFound();
  }

  return (
    <main className="relative min-h-[100dvh] sm:min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 sm:px-6 lg:px-8 pb-safe">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="link" asChild className="h-auto p-0 text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)]">
            <Link href="/">Back to home</Link>
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
