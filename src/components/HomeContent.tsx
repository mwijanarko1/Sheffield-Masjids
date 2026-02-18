"use client";

import PrayerTimesWidget from "./PrayerTimesWidget";
import MosqueMap from "./MosqueMap";
import HomeHeaderCards from "./HomeHeaderCards";
import { Mosque } from "@/types/prayer-times";
import { CustomSelect } from "@/components/ui/custom-select";
import { Card, CardContent } from "@/components/ui/card";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";

interface HomeContentProps {
  mosques: Mosque[];
}

export default function HomeContent({ mosques }: HomeContentProps) {
  const { selectedMosque, setSelectedMosque } = usePersistedMosque(mosques);

  if (!selectedMosque) {
    return (
      <Card className="border border-white/10 bg-background">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No mosques are currently available. Add mosque records in Convex to show
          them here.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="space-y-4 sm:space-y-6">
        <HomeHeaderCards mosques={mosques} />

        {/* Mosque selector + Prayer times */}
        <section className="space-y-4">
          <CustomSelect
            options={mosques}
            value={selectedMosque.id}
            onChange={(value) => {
              const m = mosques.find((x) => x.id === value);
              if (m) setSelectedMosque(m);
            }}
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
