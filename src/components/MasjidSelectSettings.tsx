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
  const { selectedMosque, setSelectedMosque } = usePersistedMosque(mosques);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-10 text-white">
      <h1 className="text-xl sm:text-3xl font-bold tracking-tight mb-2">
        Choose mosque
      </h1>
      <p className="text-sm text-white/60 mb-6">
        Select your preferred mosque for prayer times on the home screen.
      </p>

      <div className="mb-12">
        <CustomSelect
          options={mosques}
          value={selectedMosque?.id || ""}
          onChange={(id) => {
            const selected = mosques.find((m) => m.id === id);
            if (selected) setSelectedMosque(selected);
          }}
          ariaLabel="Select mosque"
          truncateLabel={false}
          listFitsContent
        />
      </div>

      <section aria-labelledby="legal-heading">
        <h2 id="legal-heading" className="text-base sm:text-lg font-bold tracking-tight mb-3 text-white/90">
          Legal & privacy
        </h2>
        <nav className="flex flex-col gap-2">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-white/70 hover:text-white transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] rounded"
          >
            Privacy policy
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-white/70 hover:text-white transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] rounded"
          >
            Terms & conditions
          </Link>
          <a
            href="mailto:mikhailspeaks@gmail.com"
            className="inline-flex items-center gap-2 min-h-[44px] py-2 text-sm text-white/70 hover:text-white transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB380] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1128] rounded"
          >
            Contact
            <ExternalLink className="w-4 h-4" aria-hidden />
          </a>
        </nav>
      </section>
    </div>
  );
}
