"use client";

import { useState } from "react";
import PrayerTimesWidget from "./PrayerTimesWidget";
import MosqueMap from "./MosqueMap";
import mosquesData from "../../public/data/mosques.json";
import { Mosque } from "@/types/prayer-times";

const mosques = mosquesData.mosques as Mosque[];

export default function HomeContent() {
  const [selectedMosque, setSelectedMosque] = useState<Mosque>(mosques[0]);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Mosque selector + Prayer times */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Select mosque
          </h2>
          <select
            value={selectedMosque.id}
            onChange={(e) => {
              const m = mosques.find((x) => x.id === e.target.value);
              if (m) setSelectedMosque(m);
            }}
            className="w-full sm:w-auto min-w-[200px] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[var(--theme-highlight)] focus:border-transparent outline-none"
            aria-label="Select mosque"
          >
            {mosques.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <PrayerTimesWidget initialMosque={selectedMosque} showDropdown={false} />
      </section>

      {/* Map */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Location
        </h2>
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
          <MosqueMap mosque={selectedMosque} />
        </div>
      </section>
    </div>
  );
}
