import type { Metadata } from "next";
import MasjidSelectSettings from "@/components/MasjidSelectSettings";
import AppLayout from "@/components/AppLayout";
import { getMosques } from "@/lib/mosques";
const description = "Choose your preferred mosque for prayer times.";

export const metadata: Metadata = {
  title: "Settings",
  description,
  alternates: {
    canonical: "/settings",
  },
};

export const revalidate = 60;

export default async function SettingsPage() {
  const mosques = await getMosques();

  return (
    <AppLayout>
      <MasjidSelectSettings mosques={mosques} />
    </AppLayout>
  );
}
