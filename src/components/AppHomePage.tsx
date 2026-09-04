"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import moment from "moment-hijri";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import {
    getPrayerTimesForDate,
    getIqamahTimesForSpecificDateWithDstMapping,
    getIqamahTime,
    getCurrentPrayer,
    getDateInSheffield,
    getDisplayedPrayerTimes,
    getNextPrayerAndCountdown,
    formatDateForDisplay,
    formatTo12Hour,
    resolveIshaIqamahForDisplay,
} from "@/lib/prayer-times";
import { DailyPrayerTimes, DailyIqamahTimes } from "@/types/prayer-times";
import MasjidlyHomeHero, { type HeroPrayerItem } from "@/components/MasjidlyHomeHero";
import MasjidlyHomePopup from "@/components/MasjidlyHomePopup";
import { useMasjidlyTheme } from "@/contexts/MasjidlyThemeContext";
import type { InitialHomePrayerWidgetData } from "@/lib/home-prayer-widget-data";
import {
    mutedTextForTheme,
    textColorForTheme,
    themeFromPrayerName,
} from "@/lib/masjidly-theme";

interface AppHomePageProps {
    mosques: Mosque[];
    initialPrayerWidgetData?: InitialHomePrayerWidgetData | null;
}

export default function AppHomePage({ mosques, initialPrayerWidgetData = null }: AppHomePageProps) {
    const {
        selectedMosque,
        isHydrated,
    } = usePersistedMosque(mosques, initialPrayerWidgetData?.mosque);
    const { theme, setTheme, uses24HourTime, showIqamahTime } = useMasjidlyTheme();
    const mosque = selectedMosque;
    const latestFetchRequestRef = useRef(0);

    const [prayerTimes, setPrayerTimes] = useState<DailyPrayerTimes | null>(
        initialPrayerWidgetData?.prayerTimes ?? null,
    );
    const [iqamahTimes, setIqamahTimes] = useState<DailyIqamahTimes | null>(
        initialPrayerWidgetData?.iqamahTimes ?? null,
    );
    const [currentPrayer, setCurrentPrayer] = useState<string | null>(null);
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
    const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const [isIqamahCountdown, setIsIqamahCountdown] = useState(false);
    const [isJummahCountdown, setIsJummahCountdown] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        if (initialPrayerWidgetData?.selectedDate) {
            const initialDate = new Date(initialPrayerWidgetData.selectedDate);
            if (!Number.isNaN(initialDate.getTime())) {
                return initialDate;
            }
        }
        const { year, month, day } = getDateInSheffield(new Date());
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    });
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [hijriDate, setHijriDate] = useState("");
    const [selectedPrayerIndex, setSelectedPrayerIndex] = useState(0);
    const [showHeroCountdown, setShowHeroCountdown] = useState(false);
    const displayedPrayerTimes = useMemo(
        () =>
            prayerTimes && mosque
                ? getDisplayedPrayerTimes(prayerTimes, selectedDate, mosque.slug)
                : null,
        [prayerTimes, selectedDate, mosque],
    );

    const SHEFFIELD_TZ = "Europe/London";

    const getHijriDate = (date: Date) => {
        try {
            const { year, month, day } = getDateInSheffield(date);
            const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
            const hijriMoment = moment(noonUtc);
            const hijriMonthsEnglish = [
                "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
                "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
                "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
            ];
            return `${hijriMoment.iDate()} ${hijriMonthsEnglish[hijriMoment.iMonth()]} ${hijriMoment.iYear()} AH`;
        } catch {
            return "";
        }
    };

    /** Single-line friendly labels for narrow headers (avoids splitting multi-word months). */
    const getHijriDateCompact = (date: Date) => {
        try {
            const { year, month, day } = getDateInSheffield(date);
            const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
            const hijriMoment = moment(noonUtc);
            const hijriMonthsShort = [
                "Muh.", "Saf.", "Rab.I", "Rab.II", "Jum.I", "Jum.II", "Raj.", "Sha.",
                "Ram.", "Shaw.", "Dh.Q.", "Dh.H.",
            ];
            return `${hijriMoment.iDate()} ${hijriMonthsShort[hijriMoment.iMonth()]} ${hijriMoment.iYear()}`;
        } catch {
            return "";
        }
    };

    const isToday = useMemo(() => {
        const sel = getDateInSheffield(selectedDate);
        const n = getDateInSheffield(new Date());
        return sel.year === n.year && sel.month === n.month && sel.day === n.day;
    }, [selectedDate, currentTime]);

    const isFridaySelected = useMemo(() => {
        const weekday = new Intl.DateTimeFormat("en-GB", {
            timeZone: SHEFFIELD_TZ,
            weekday: "long",
        }).format(selectedDate);
        return weekday === "Friday";
    }, [selectedDate]);

    const jummahSummaryTime = useMemo(() => {
        const j = iqamahTimes?.jummah?.trim();
        if (!j || j === "-" || j === "-") return null;
        return j;
    }, [iqamahTimes]);

    useEffect(() => {
        if (!isHydrated || !mosque) return;

        const activeMosque = mosque;
        const requestId = ++latestFetchRequestRef.current;
        let isActive = true;

        async function fetchTimes() {
            try {
                const [times, iqamah] = await Promise.all([
                    getPrayerTimesForDate(activeMosque.slug, selectedDate),
                    getIqamahTimesForSpecificDateWithDstMapping(activeMosque.slug, selectedDate),
                ]);
                if (!isActive || latestFetchRequestRef.current !== requestId) return;
                setPrayerTimes(times);
                setIqamahTimes(iqamah);
                setCurrentPrayer(
                    getCurrentPrayer(getDisplayedPrayerTimes(times, selectedDate, activeMosque.slug)),
                );
                setHijriDate(getHijriDate(selectedDate));
            } catch (e) {
                if (!isActive || latestFetchRequestRef.current !== requestId) return;
                console.error("Failed to fetch times:", e);
            }
        }
        fetchTimes();

        return () => {
            isActive = false;
        };
    }, [isHydrated, mosque, selectedDate]);

    useEffect(() => {
        if (!isToday) {
            setCurrentPrayer(null);
            setNextPrayer(null);
            setCountdown(null);
            return;
        }
        if (!displayedPrayerTimes || !iqamahTimes || !mosque) return;

        const updateCountdown = () => {
            setCurrentTime(new Date());
            setCurrentPrayer(getCurrentPrayer(displayedPrayerTimes));
            const result = getNextPrayerAndCountdown(displayedPrayerTimes, iqamahTimes, {
                selectedDate,
                mosqueSlug: mosque.slug,
            });
            setNextPrayer(result.nextPrayer);
            setCountdown(result.countdown);
            setIsIqamahCountdown(result.isIqamah);
            setIsJummahCountdown(result.isJummah ?? false);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [displayedPrayerTimes, iqamahTimes, isToday, selectedDate, mosque]);

    // Clock tick when not viewing today (countdown effect handles when isToday)
    useEffect(() => {
        if (isToday) return;
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, [isToday]);

    const heroPrayers = useMemo<HeroPrayerItem[]>(() => {
        if (!displayedPrayerTimes || !mosque) return [];
        const iq = iqamahTimes;
        const getIq = (key: string): string => {
            if (!iq) return "-";
            switch (key) {
                case "Fajr":
                    return getIqamahTime("fajr", displayedPrayerTimes.fajr, iq);
                case "Dhuhr":
                    return getIqamahTime("dhuhr", displayedPrayerTimes.dhuhr, iq);
                case "Asr":
                    return getIqamahTime("asr", displayedPrayerTimes.asr, iq);
                case "Maghrib":
                    return getIqamahTime("maghrib", displayedPrayerTimes.maghrib, iq);
                case "Isha":
                    return resolveIshaIqamahForDisplay(
                        mosque.slug,
                        selectedDate,
                        displayedPrayerTimes.isha,
                        iq,
                        displayedPrayerTimes.maghrib,
                    );
                default:
                    return "-";
            }
        };

        const dhuhrLabel = isFridaySelected ? "Jummah" : "Dhuhr";
        const dhuhrAdhan = isFridaySelected
            ? (jummahSummaryTime ?? displayedPrayerTimes.dhuhr)
            : displayedPrayerTimes.dhuhr;
        const dhuhrIqamah = isFridaySelected
            ? (jummahSummaryTime ?? getIq("Dhuhr"))
            : getIq("Dhuhr");

        return [
            { id: "fajr", label: "Fajr", letter: "F", adhan: displayedPrayerTimes.fajr, iqamah: getIq("Fajr"), theme: "fajr" },
            { id: "sunrise", label: "Sunrise", letter: "S", adhan: displayedPrayerTimes.sunrise || "-", iqamah: null, theme: "sunrise" },
            { id: "dhuhr", label: dhuhrLabel, letter: isFridaySelected ? "J" : "D", adhan: dhuhrAdhan, iqamah: dhuhrIqamah, theme: "dhuhr" },
            { id: "asr", label: "Asr", letter: "A", adhan: displayedPrayerTimes.asr, iqamah: getIq("Asr"), theme: "asr" },
            { id: "maghrib", label: "Maghrib", letter: "M", adhan: displayedPrayerTimes.maghrib, iqamah: getIq("Maghrib"), theme: "maghrib" },
            { id: "isha", label: "Isha", letter: "I", adhan: displayedPrayerTimes.isha, iqamah: getIq("Isha"), theme: "isha" },
        ];
    }, [displayedPrayerTimes, iqamahTimes, mosque, selectedDate, isFridaySelected, jummahSummaryTime]);

    // Keep selected index in range when prayer list changes
    useEffect(() => {
        if (heroPrayers.length === 0) return;
        if (selectedPrayerIndex >= heroPrayers.length) {
            setSelectedPrayerIndex(0);
        }
    }, [heroPrayers.length, selectedPrayerIndex]);

    // Auto-select next prayer once when the next prayer changes (Masjidly onAppear).
    useEffect(() => {
        if (!isToday || heroPrayers.length === 0) return;
        if (nextPrayer?.name) {
            const key = nextPrayer.name.toLowerCase();
            const idx = heroPrayers.findIndex((p) => {
                if (key === "jummah") return p.id === "dhuhr";
                return p.id === key || p.label.toLowerCase() === key;
            });
            if (idx >= 0) setSelectedPrayerIndex(idx);
            return;
        }
        const ishaIdx = heroPrayers.findIndex((p) => p.id === "isha");
        if (ishaIdx >= 0) setSelectedPrayerIndex(ishaIdx);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: follow next prayer only
    }, [isToday, nextPrayer?.name, heroPrayers.length]);

    const selectedHero = heroPrayers[selectedPrayerIndex] ?? heroPrayers[0] ?? null;
    const skyTheme = useMemo(
        () => selectedHero?.theme ?? themeFromPrayerName(nextPrayer?.name ?? currentPrayer),
        [selectedHero?.theme, nextPrayer?.name, currentPrayer],
    );

    useEffect(() => {
        setTheme(skyTheme);
    }, [skyTheme, setTheme]);

    const fg = textColorForTheme(theme);
    const fgMuted = mutedTextForTheme(theme);
    const countdownClock = useMemo(() => {
        if (!countdown) return null;
        const pad = (n: number) => n.toString().padStart(2, "0");
        return countdown.hours > 0
            ? `-${countdown.hours}:${pad(countdown.minutes)}:${pad(countdown.seconds)}`
            : `-${countdown.minutes}:${pad(countdown.seconds)}`;
    }, [countdown]);

    const countdownLabel = useMemo(() => {
        if (!nextPrayer) return null;
        if (isJummahCountdown) return "Khutbah in";
        if (isIqamahCountdown) return `Iqamah of ${nextPrayer.name}`;
        return `Adhan of ${nextPrayer.name}`;
    }, [nextPrayer, isIqamahCountdown, isJummahCountdown]);

    if (!mosque) {
        return (
            <div className="relative isolate flex h-full w-full min-h-[100dvh] flex-col font-sans" style={{ color: fg }}>
                <div className="flex flex-1 items-center justify-center px-4 text-center" style={{ color: fgMuted }}>
                    Loading mosque prayer times...
                </div>
            </div>
        );
    }

    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d);
        setShowHeroCountdown(false);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d);
        setShowHeroCountdown(false);
    };

    return (
        <div className="relative isolate min-h-[100dvh] w-full">
            <MasjidlyHomePopup />
            <h1 className="sr-only">
                UK mosque prayer times - adhan and iqamah in Sheffield and other cities
            </h1>
            <MasjidlyHomeHero
                fg={fg}
                fgMuted={fgMuted}
                skyTheme={theme}
                gregorianDate={formatDateForDisplay(selectedDate)}
                hijriDate={hijriDate || getHijriDateCompact(selectedDate)}
                onPrevDay={handlePrevDay}
                onNextDay={handleNextDay}
                prayers={heroPrayers}
                selectedIndex={Math.min(selectedPrayerIndex, Math.max(heroPrayers.length - 1, 0))}
                onSelectPrayer={(index) => {
                    setSelectedPrayerIndex(index);
                    setShowHeroCountdown(false);
                }}
                showCountdown={isToday && showHeroCountdown}
                onToggleCountdown={() => {
                    if (!isToday) return;
                    setShowHeroCountdown((v) => !v);
                }}
                countdownLabel={countdownLabel}
                countdownClock={countdownClock}
                isToday={isToday}
                selectedDate={selectedDate.toISOString().slice(0, 10)}
                onDateChange={(value) => {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
                    const date = new Date(`${value}T12:00:00Z`);
                    if (Number.isNaN(date.getTime())) return;
                    setSelectedDate(date);
                    setShowHeroCountdown(false);
                }}
                onToday={() => {
                    const { year, month, day } = getDateInSheffield(new Date());
                    setSelectedDate(new Date(Date.UTC(year, month - 1, day, 12)));
                }}
                showIqamahTime={showIqamahTime}
                formatTime={(hhmm) =>
                    uses24HourTime ? hhmm : formatTo12Hour(hhmm)
                }
            />
        </div>
    );
}
