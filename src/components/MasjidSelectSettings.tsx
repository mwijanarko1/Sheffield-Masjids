"use client";

import Link from "next/link";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import { ExternalLink } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface MasjidSelectSettingsProps {
  mosques: Mosque[];
}

export default function MasjidSelectSettings({ mosques }: MasjidSelectSettingsProps) {
  const { selectedMosque, setSelectedMosque, isHydrated } = usePersistedMosque(mosques);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-10 text-white">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2 drop-shadow-sm">
          Settings
        </h1>
        <p className="text-sm text-[var(--theme-text-muted)] mb-8">
          Personalise your experience and preferred mosque.
        </p>
      </div>

      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(10,17,40,0.25)] p-5 sm:p-6 backdrop-blur-[20px] saturate-[180%] shadow-xl mb-8">
        {/* Specular top edge shimmer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />
        
        <h2 className="text-lg font-bold tracking-tight mb-4 text-white">
          Primary Mosque
        </h2>
        <p className="text-sm text-[var(--theme-text-muted)] mb-6">
          Select your preferred mosque for prayer times on the home screen.
        </p>

        <div className="mb-2">
          <CustomSelect
            options={mosques}
            value={isHydrated ? selectedMosque?.id || "" : ""}
            onChange={(id) => {
              const selected = mosques.find((m) => m.id === id);
              if (selected) setSelectedMosque(selected);
            }}
            ariaLabel="Select mosque"
            truncateLabel={false}
            listFitsContent
            className="w-full"
          />
        </div>
      </section>

      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[rgba(10,17,40,0.25)] p-5 sm:p-6 backdrop-blur-[20px] saturate-[180%] shadow-xl" aria-labelledby="legal-heading">
        {/* Specular top edge shimmer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
        />

        <h2 id="legal-heading" className="text-lg font-bold tracking-tight mb-4 text-white">
          Legal & Privacy
        </h2>
        <nav className="flex flex-col gap-1">
          <Link
            href="/privacy"
            className="group flex items-center justify-between min-h-[48px] py-2 text-sm text-white/80 hover:text-white transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] rounded-lg px-2 -mx-2 hover:bg-white/5"
          >
            <span>Privacy Policy</span>
            <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
          <div className="h-px bg-white/5 mx-2" />
          <Link
            href="/terms"
            className="group flex items-center justify-between min-h-[48px] py-2 text-sm text-white/80 hover:text-white transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] rounded-lg px-2 -mx-2 hover:bg-white/5"
          >
            <span>Terms & Conditions</span>
            <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
          <div className="h-px bg-white/5 mx-2" />
          <a
            href="mailto:mikhailspeaks@gmail.com"
            className="group flex items-center justify-between min-h-[48px] py-2 text-sm text-white/80 hover:text-white transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring-focus)] rounded-lg px-2 -mx-2 hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              Contact
              <ExternalLink className="w-3.5 h-3.5 opacity-60" aria-hidden />
            </span>
            <svg className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </nav>
      </section>
      
      <div className="mt-12 text-center">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
          Sheffield Masjids v1.0
        </p>
      </div>
    </div>
  );
}
