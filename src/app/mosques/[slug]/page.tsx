import React from 'react';
import type { Metadata } from "next";
import { notFound } from 'next/navigation';
import PrayerTimesWidget from '@/components/PrayerTimesWidget';
import MosqueMap from '@/components/MosqueMap';
import mosquesData from '../../../../public/data/mosques.json';
import { Mosque } from '@/types/prayer-times';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HIDDEN_MOSQUE_SLUGS, SITE_NAME } from '@/lib/site';

interface MosquePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: MosquePageProps): Promise<Metadata> {
  const { slug } = await params;
  const mosque = (mosquesData.mosques as Mosque[]).find((m) => m.slug === slug);

  if (!mosque || HIDDEN_MOSQUE_SLUGS.has(slug)) {
    return {
      title: "Mosque Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${mosque.name} | ${SITE_NAME}`;
  const description = `Prayer and iqamah times, location, and mosque details for ${mosque.name} in Sheffield.`;

  return {
    title: mosque.name,
    description,
    alternates: {
      canonical: `/mosques/${mosque.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/mosques/${mosque.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MosquePage({ params }: MosquePageProps) {
  const { slug } = await params;
  if (HIDDEN_MOSQUE_SLUGS.has(slug)) {
    notFound();
  }
  const mosque = mosquesData.mosques.find((m: Mosque) => m.slug === slug);

  if (!mosque) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] sm:min-h-screen bg-background pb-8 sm:pb-16">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8 xl:max-w-6xl">
        <Button
          variant="link"
          asChild
          className="inline-flex min-h-[44px] -ml-1 touch-manipulation py-2 text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)]"
        >
          <Link href="/">
            <svg className="mr-2 size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </Button>

        <header className="mb-6 sm:mb-10">
          <h1 className="mb-3 text-xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {mosque.name}
          </h1>
          <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground sm:text-base">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5 text-[var(--theme-highlight)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="break-words">{mosque.address}</span>
          </p>
          {mosque.website && (
            <a
              href={mosque.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Visit website
            </a>
          )}
        </header>

        <div className="space-y-8 sm:space-y-12">
          <section>
            <h2 className="mb-4 text-lg font-bold text-foreground">Location</h2>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <MosqueMap mosque={mosque} />
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold text-foreground">Prayer times</h2>
            <PrayerTimesWidget initialMosque={mosque} showDropdown={false} />
          </section>
        </div>
      </div>
    </main>
  );
}
