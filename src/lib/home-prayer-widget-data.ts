import {
  getDateInSheffield,
  getIqamahTimesForSpecificDateWithDstMapping,
  getPrayerTimesForDate,
} from "@/lib/prayer-times";
export {
  DEFAULT_HOME_MOSQUE_SLUG,
  getDefaultHomeMosque,
} from "@/lib/home-prayer-defaults";
import { getDefaultHomeMosque } from "@/lib/home-prayer-defaults";
import type { DailyIqamahTimes, DailyPrayerTimes, Mosque } from "@/types/prayer-times";

export type InitialHomePrayerWidgetData = {
  mosque: Mosque;
  prayerTimes: DailyPrayerTimes;
  iqamahTimes: DailyIqamahTimes;
  selectedDate: string;
};

export async function getInitialHomePrayerWidgetData(
  mosques: Mosque[],
): Promise<InitialHomePrayerWidgetData | null> {
  const mosque = getDefaultHomeMosque(mosques);
  if (!mosque) return null;

  try {
    const { year, month, day } = getDateInSheffield(new Date());
    const selectedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    const [prayerTimes, iqamahTimes] = await Promise.all([
      getPrayerTimesForDate(mosque.slug, selectedDate),
      getIqamahTimesForSpecificDateWithDstMapping(mosque.slug, selectedDate),
    ]);

    return {
      mosque,
      prayerTimes,
      iqamahTimes,
      selectedDate: selectedDate.toISOString(),
    };
  } catch (error) {
    console.error("Could not prepare initial home prayer widget data:", error);
    return null;
  }
}
