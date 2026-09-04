import type { Metadata } from "next";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
import { getMosques } from "@/lib/mosques";
import { getMosqueCities } from "@/lib/mosque-cities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mosque Directory: Prayer Times by City",
  description: "Browse mosques by city and country. Find local mosque prayer times, adhan and iqamah schedules, monthly timetables and addresses.",
  alternates: { canonical: "/mosques" },
  openGraph: {
    title: "Mosque Directory: Prayer Times by City",
    description: "Find local mosques and their prayer timetables by city and country.",
    url: "/mosques",
  },
};

export default async function MosqueDirectoryPage() {
  const mosques = await getMosques();
  const cities = getMosqueCities(mosques);
  return (
    <AppLayout>
      <MasjidlyContentShell title="Mosques and prayer times by city">
        <p>
          Browse {mosques.length} mosques across {cities.length} cities, including Sheffield.
          Choose a city, then a mosque to see its prayer times, iqamah schedule and address.
          Congregation times vary between mosques, so check the timetable for the mosque you plan to visit.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {cities.map((city) => (
            <li key={city.href}>
              <Link href={city.href} prefetch={false}>{city.name} mosques and prayer times</Link>
              <p className="text-sm">{city.countryName} · {city.mosques.length} {city.mosques.length === 1 ? "mosque" : "mosques"}</p>
            </li>
          ))}
        </ul>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
