import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AppLayout from "@/components/AppLayout";
import MasjidlyContentShell from "@/components/masjidly-ui/MasjidlyContentShell";
import { getMosques } from "@/lib/mosques";
import { getMosqueCities } from "@/lib/mosque-cities";

interface CityPageProps {
  params: Promise<{ country: string; city: string }>;
}

export const dynamic = "force-dynamic";

async function getCity(params: CityPageProps["params"]) {
  const { country, city } = await params;
  const cities = getMosqueCities(await getMosques());
  return cities.find((item) => item.href === `/cities/${country}/${city}`);
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const city = await getCity(params);
  if (!city) return { title: "City Not Found", robots: { index: false, follow: false } };
  const title = `${city.name} Mosques & Prayer Times`;
  const description = `Find mosque prayer times in ${city.name}, ${city.countryName}. Browse adhan and iqamah times, monthly timetables and addresses for local mosques.`;
  return {
    title,
    description,
    alternates: { canonical: city.href },
    openGraph: { title, description, url: city.href, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const city = await getCity(params);
  if (!city) notFound();
  return (
    <AppLayout>
      <MasjidlyContentShell title={`${city.name} mosques and prayer times`} backHref="/mosques" backLabel="All cities and mosques">
        <p>
          Find prayer times and iqamah schedules for {city.mosques.length} {city.mosques.length === 1 ? "mosque" : "mosques"} in {city.name}, {city.countryName}.
          Choose a mosque below for its daily adhan and congregation times, monthly timetable and location.
        </p>
        <ul className="space-y-6">
          {city.mosques.map((mosque) => (
            <li key={mosque.slug}>
              <h2><Link href={`/mosques/${mosque.slug}`} prefetch={false}>{mosque.name}</Link></h2>
              <p>{mosque.address}</p>
              <Link href={`/mosques/${mosque.slug}/timetable`} prefetch={false} className="text-sm">{mosque.name} monthly timetable</Link>
            </li>
          ))}
        </ul>
        <section>
          <h2>Checking prayer times in {city.name}</h2>
          <p>
            Adhan marks the start of a prayer time; iqamah is when the congregation begins.
            Iqamah and Jumu&apos;ah times can differ between mosques in {city.name}.
            Check the date on the timetable and confirm short-notice changes with the mosque before travelling.
          </p>
        </section>
      </MasjidlyContentShell>
    </AppLayout>
  );
}
