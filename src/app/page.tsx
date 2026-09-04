import type { Metadata } from "next";
import Link from "next/link";
import AppHomePage from "@/components/AppHomePage";
import WebsiteJsonLd from "@/components/WebsiteJsonLd";
import { getInitialHomePrayerWidgetData } from "@/lib/home-prayer-widget-data";
import { getMosques } from "@/lib/mosques";
import { MOSQUE_NAMES, SITE_NAME } from "@/lib/site";

const homeTitle = `Sheffield Prayer Times Today | Adhan & Iqamah | ${SITE_NAME}`;
const homeDescription =
  "Find Sheffield prayer times today: adhan and iqamah for every major mosque and masjid. Madina Masjid, Sheffield Grand Mosque, Al-Huda Academy, Masjid Sunnah, and more - daily, monthly, and Ramadan timetables in UK time.";

export const metadata: Metadata = {
  title: "Sheffield Prayer Times Today",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
  },
  keywords: [
    "Sheffield prayer times",
    "prayer times in Sheffield",
    "Sheffield mosque prayer times",
    "Sheffield masjid prayer times",
    "prayer times Sheffield",
    "Sheffield salah times",
    ...MOSQUE_NAMES.map((n) => `${n} prayer times`),
  ],
};

export const revalidate = 60;

export default async function Home() {
  const mosques = await getMosques();
  const initialPrayerWidgetData = await getInitialHomePrayerWidgetData(mosques);

  return (
    <main className="relative min-h-[100svh] w-full">
      <WebsiteJsonLd />
      <AppHomePage
        mosques={mosques}
        initialPrayerWidgetData={initialPrayerWidgetData}
      />
      <section className="relative z-10 mx-auto max-w-4xl px-5 pb-32 pt-16 text-[#1D2433] sm:px-8">
        <div className="rounded-2xl border border-white/40 bg-white/80 p-6 shadow-xl backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl text-[#1D2433]">Sheffield mosque prayer times</h2>
          <div className="mt-5 space-y-4 leading-7 text-[#1D2433]/80">
            <p>
              Sheffield Masjids brings together published prayer times for mosques across Sheffield. Choose a mosque above to see today&apos;s Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha adhan times alongside its congregation or iqamah times. All dates and clocks use the Europe/London timezone, including British Summer Time changes.
            </p>
            <p>
              Iqamah times are set by each mosque and can differ across the city. If you need a congregation time, select the mosque you attend rather than treating one timetable as a city-wide schedule. Mosque pages also provide addresses, monthly tables, Ramadan schedules when available, and calendar feeds that can be added to a phone or computer.
            </p>
            <p>
              The timetable data comes from mosque-published sources and is presented for convenient reference. Announcements and last-minute changes may not appear immediately, so confirm important times directly with the mosque, especially for Jumu&apos;ah, Ramadan, Eid, and special events.
            </p>
            <section className="space-y-3 pt-4">
              <h3 className="text-xl font-bold text-[#1D2433]">Adhan and iqamah are different times</h3>
              <p>
                Adhan is the start of a prayer&apos;s time window. Iqamah is the time a particular mosque plans to begin the congregational prayer. A city can share broadly similar adhan times while its mosques choose different iqamah times. The timetable labels both values so that a visitor can distinguish the beginning of the prayer from the congregation they intend to join. Sunrise is included for reference but is not an obligatory prayer, and its column does not have an iqamah. When a mosque publishes wording such as after Maghrib instead of a clock time, the site preserves that meaning rather than inventing a minute value.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Choosing the correct mosque</h3>
              <p>
                Use the mosque selector to choose the congregation you normally attend. Each record belongs to a named mosque and includes its address so that similarly named places can be distinguished. If you are travelling across Sheffield, compare the destination mosque rather than relying on your saved preference. A selected mosque may remain stored in the browser for convenience, but changing it does not alter any timetable. If a mosque is missing or its address has changed, use the contact page and include a reliable public source for the correction.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Dates, timezone, and clock changes</h3>
              <p>
                Sheffield Masjids displays civil dates and clock times in Europe/London local time. That timezone follows Greenwich Mean Time in winter and British Summer Time when the United Kingdom moves its clocks forward. The date shown with a timetable matters, particularly around midnight and the spring or autumn clock change. Do not convert a displayed Sheffield time again if your device is already using UK local time. Travellers viewing from another timezone should compare the stated Sheffield date before setting a reminder.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Monthly and daily timetables</h3>
              <p>
                The home screen is intended for a quick check of today&apos;s schedule. The timetable pages provide a longer view for planning journeys, work breaks, school arrangements, or recurring reminders. Select the relevant month and confirm the mosque name at the top of the table. Some mosques publish iqamah changes as date ranges, while others publish one value for each date. The site expands or presents those records without calculating replacement prayer times. A blank or unavailable value should be treated as missing information, not as permission to infer a time from another mosque.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Ramadan schedules</h3>
              <p>
                Ramadan timetables can differ from ordinary monthly schedules because mosques may publish suhur endings, adjusted Fajr congregations, daily Maghrib values, later Isha congregations, or special Jumu&apos;ah arrangements. Open the Ramadan timetable for the mosque you attend and check the Gregorian date as well as the Ramadan day. The directory does not calculate a missing Ramadan schedule from astronomical formulas. Where a mosque has not supplied suitable full-period data, users should consult that mosque directly instead of applying another congregation&apos;s timetable.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Jumu&apos;ah and special announcements</h3>
              <p>
                Friday information may be published as a Jumu&apos;ah or Friday congregation time rather than the normal weekday Dhuhr iqamah. Some mosques run more than one Friday congregation, change the schedule seasonally, or announce temporary arrangements when capacity is limited. The directory can only display the structured value available in its source. Confirm directly with the mosque when you need a second congregation, khutbah start, women&apos;s facilities, accessibility information, parking guidance, or details for Eid and other special prayers.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Calendar exports and reminders</h3>
              <p>
                Calendar exports let you add a selected mosque&apos;s timetable to software that supports the iCalendar format. Choose whether the export should contain adhan events, iqamah events, or both, and check the month or year before downloading or subscribing. Calendar software may apply its own notification settings and timezone display, so inspect one imported event before depending on the full series. If the mosque later changes a congregation time, a previously downloaded static file may not update automatically. Return to the site or use a current feed when accuracy over time matters.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Sources, corrections, and responsibility</h3>
              <p>
                Timetables are collected from structured mosque publications such as official web pages, APIs, downloadable tables, or information supplied for the directory. The project aims to copy those values accurately and preserve distinctions such as adhan, iqamah, sunrise, and date ranges. It does not present calculated placeholders as verified mosque data. Even a correctly copied timetable can become outdated after a committee announcement, so the mosque remains the final authority for its congregation. Correction reports should identify the mosque, date, field, expected value, and supporting source.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Finding a time quickly</h3>
              <p>
                Start with the home selector when you know the mosque and only need today&apos;s times. Use the city timetable view when you need another date, and use the comparison page when deciding between several nearby congregations. Read the prayer name, adhan column, and iqamah column together before acting on a result. A search result or assistant may quote a single clock value without enough context, so verify that it names the mosque, prayer, date, and whether the value is adhan or iqamah. Those four details prevent most misunderstandings when schedules are shared in messages or added to personal calendars.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">What this directory does not decide</h3>
              <p>
                Sheffield Masjids is an information service, not a mosque committee or religious authority. It does not decide prayer calculation methods, resolve differences of fiqh, announce the beginning of Ramadan or Eid, reserve mosque facilities, or confirm whether a congregation has space. It also does not infer accessibility, women&apos;s prayer space, parking, classes, funeral arrangements, or event details from a timetable. Those questions should go to the relevant mosque. The directory&apos;s role is narrower: identify the selected mosque, present its available published schedule clearly, and provide stable pages that people and software can retrieve.
              </p>
            </section>
            <section className="space-y-3">
              <h3 className="text-xl font-bold text-[#1D2433]">Missing and unusual timetable values</h3>
              <p>
                A missing value means the directory does not have a verified value for that field. It should not be replaced with yesterday&apos;s time, a nearby mosque&apos;s time, or a calculated estimate. Some published schedules use words instead of digits, including after Maghrib, straight after Maghrib, or various. Those labels describe the mosque&apos;s arrangement and are intentionally kept as labels. When a time appears unusual, check the selected date and mosque first, then compare it with the mosque&apos;s original notice. Report confirmed transcription errors through the contact page with enough evidence to identify the correct record.
              </p>
            </section>
          </div>
          <nav aria-label="Information" className="mt-7 flex flex-wrap gap-4 text-sm font-bold">
            <Link href="/timetable" className="text-[#2E8DFF] underline underline-offset-4">Browse timetables</Link>
            <Link href="/compare" className="text-[#2E8DFF] underline underline-offset-4">Compare mosques</Link>
            <Link href="/about" className="text-[#2E8DFF] underline underline-offset-4">About Sheffield Masjids</Link>
            <Link href="/contact" className="text-[#2E8DFF] underline underline-offset-4">Contact</Link>
            <Link href="/privacy" className="text-[#2E8DFF] underline underline-offset-4">Privacy</Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
