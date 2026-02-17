import React from 'react';
import { notFound } from 'next/navigation';
import PrayerTimesWidget from '@/components/PrayerTimesWidget';
import MosqueMap from '@/components/MosqueMap';
import mosquesData from '../../../../public/data/mosques.json';
import { Mosque } from '@/types/prayer-times';
import Link from 'next/link';

interface MosquePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function MosquePage({ params }: MosquePageProps) {
  const { slug } = await params;
  const mosque = mosquesData.mosques.find((m: Mosque) => m.slug === slug);

  if (!mosque) {
    notFound();
  }

  return (
    <main className="min-h-[100dvh] sm:min-h-screen bg-[var(--theme-bg)] dark:bg-[var(--theme-bg-dark)] pb-8 sm:pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-6 sm:pt-10 sm:px-6 lg:px-8">
        <Link 
          href="/"
          className="inline-flex items-center min-h-[44px] py-2 text-sm font-medium text-[var(--theme-highlight)] hover:text-[var(--theme-highlight-bright)] active:opacity-80 transition-colors touch-manipulation -ml-1"
        >
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <header className="mb-6 sm:mb-10">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight leading-tight">
            {mosque.name}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 flex items-start gap-2 mb-4">
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Location</h2>
            <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
              <MosqueMap mosque={mosque} />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Prayer times</h2>
            <PrayerTimesWidget initialMosque={mosque} showDropdown={false} />
          </section>
        </div>
      </div>
    </main>
  );
}
