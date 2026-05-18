"use client";

import LastTenChecklistSection from "@/components/LastTenChecklistSection";

export default function LastTenNightsPage() {
  return (
    <div className="flex h-full flex-col">
      <h1 className="sr-only">Ramadan Checklist</h1>
      <LastTenChecklistSection variant="page" />
    </div>
  );
}
