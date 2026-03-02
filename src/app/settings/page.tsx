import type { Metadata } from "next";
import MasjidSelectSettings from "@/components/MasjidSelectSettings";
import AppLayout from "@/components/AppLayout";
import { getMosques } from "@/lib/mosques";
import { SITE_NAME } from "@/lib/site";

const title = `Settings | ${SITE_NAME}`;
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
    <AppLayout activeTab="settings">
      <MasjidSelectSettings mosques={mosques} />
    </AppLayout>
  );
}
