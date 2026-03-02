import type { Metadata } from "next";
import AppHomePage from "@/components/AppHomePage";
import { getMosques } from "@/lib/mosques";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export const revalidate = 60;

export default async function Home() {
  const mosques = await getMosques();

  return (
    <main className="relative h-[100dvh] min-h-[100svh] w-full overflow-hidden">
      <AppHomePage mosques={mosques} />
    </main>
  );
}
