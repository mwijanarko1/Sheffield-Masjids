"use client";

import PrayerTimesWidget from "./PrayerTimesWidget";
import MosqueMap from "./MosqueMap";
import HomeHeaderCards from "./HomeHeaderCards";
import mosquesData from "../../public/data/mosques.json";
import { Mosque } from "@/types/prayer-times";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card, CardContent } from "@/components/ui/card";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";

const mosques = (mosquesData.mosques as Mosque[]).filter(
  (m) => m.id !== "sheffield-grand-mosque"
);

export default function HomeContent() {
  const { selectedMosque, setSelectedMosque } = usePersistedMosque(mosques);

  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="space-y-4 sm:space-y-6">
        <HomeHeaderCards />

        {/* Mosque selector + Prayer times */}
        <section className="space-y-4">
          <CustomSelect
            options={mosques}
            value={selectedMosque.id}
            onChange={(value) => {
              const m = mosques.find((x) => x.id === value);
              if (m) setSelectedMosque(m);
            }}
            className="[&>button]:bg-gradient-to-b [&>button]:from-[var(--theme-primary)] [&>button]:via-[var(--theme-primary)] [&>button]:via-[15%] [&>button]:to-[var(--theme-accent)] [&>button]:text-white [&>button]:border-white/40 sm:[&>button]:border-2 sm:[&>button]:border-white/60 [&>button]:shadow-lg [&>button]:ring-white/40 [&>button]:ring-offset-transparent [&>button>svg]:opacity-80"
            ariaLabel="Select mosque"
          />
          <PrayerTimesWidget initialMosque={selectedMosque} showDropdown={false} />
        </section>
      </div>

      {/* Map */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          Location
        </h2>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <MosqueMap mosque={selectedMosque} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
