"use client";

import React, { useEffect, useState, useMemo } from "react";
import moment from "moment-hijri";
import { Mosque } from "@/types/prayer-times";
import { usePersistedMosque } from "@/hooks/use-persisted-mosque";
import {
    getPrayerTimesForDate,
    getIqamahTimesForSpecificDate,
    getIqamahTime,
    getCurrentPrayer,
    getDateInSheffield,
    getNextPrayerAndCountdown,
    formatDateForDisplay,
} from "@/lib/prayer-times";
import { DailyPrayerTimes, DailyIqamahTimes } from "@/types/prayer-times";
import AppBottomNav from "@/components/AppBottomNav";
import JummahWidget from "@/components/JummahWidget";
import { cn } from "@/lib/utils";

interface AppHomePageProps {
    mosques: Mosque[];
}

export default function AppHomePage({ mosques }: AppHomePageProps) {
    const { selectedMosque } = usePersistedMosque(mosques);
    const mosque = selectedMosque || mosques[0];

    const [prayerTimes, setPrayerTimes] = useState<DailyPrayerTimes | null>(null);
    const [iqamahTimes, setIqamahTimes] = useState<DailyIqamahTimes | null>(null);
    const [currentPrayer, setCurrentPrayer] = useState<string | null>(null);
    const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
    const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
    const [isIqamahCountdown, setIsIqamahCountdown] = useState(false);
    const [isJummahCountdown, setIsJummahCountdown] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        const { year, month, day } = getDateInSheffield(new Date());
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    });
    const [currentTime, setCurrentTime] = useState(() => new Date());
    const [hijriDate, setHijriDate] = useState("");

    const SHEFFIELD_TZ = "Europe/London";
    const getSheffieldWallClockTime = (date: Date): Date =>
        new Date(date.toLocaleString("en-US", { timeZone: SHEFFIELD_TZ }));

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

    const isToday = useMemo(() => {
        const sel = getDateInSheffield(selectedDate);
        const n = getDateInSheffield(new Date());
        return sel.year === n.year && sel.month === n.month && sel.day === n.day;
    }, [selectedDate]);

    const isSummer = useMemo(() => {
        const year = selectedDate.getFullYear();
        const may15 = new Date(year, 4, 15);
        const aug15 = new Date(year, 7, 15);
        return selectedDate >= may15 && selectedDate <= aug15;
    }, [selectedDate]);

    useEffect(() => {
        async function fetchTimes() {
            if (!mosque) return;
            try {
                const [times, iqamah] = await Promise.all([
                    getPrayerTimesForDate(mosque.slug, selectedDate),
                    getIqamahTimesForSpecificDate(mosque.slug, selectedDate),
                ]);
                setPrayerTimes(times);
                setIqamahTimes(iqamah);
                setCurrentPrayer(getCurrentPrayer(times));
                setHijriDate(getHijriDate(selectedDate));
            } catch (e) {
                console.error("Failed to fetch times:", e);
            }
        }
        fetchTimes();
    }, [mosque, selectedDate]);

    useEffect(() => {
        if (!isToday) {
            setCurrentPrayer(null);
            setNextPrayer(null);
            setCountdown(null);
            return;
        }
        if (!prayerTimes || !iqamahTimes) return;

        const updateCountdown = () => {
            setCurrentTime(new Date());
            setCurrentPrayer(getCurrentPrayer(prayerTimes));
            const result = getNextPrayerAndCountdown(prayerTimes, iqamahTimes, {
                selectedDate,
                isSummer,
            });
            setNextPrayer(result.nextPrayer);
            setCountdown(result.countdown);
            setIsIqamahCountdown(result.isIqamah);
            setIsJummahCountdown(result.isJummah ?? false);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [prayerTimes, iqamahTimes, isToday, selectedDate, isSummer]);

    // Clock tick when not viewing today (countdown effect handles when isToday)
    useEffect(() => {
        if (isToday) return;
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, [isToday]);

    const sheffieldNow = useMemo(
        () => getSheffieldWallClockTime(currentTime),
        [currentTime],
    );

    const isFriday = useMemo(() => sheffieldNow.getDay() === 5, [sheffieldNow]);

    const prayers = useMemo(() => {
        if (!prayerTimes) return [];
        const iq = iqamahTimes;
        const getIqamah = (prayerKey: string): string => {
            if (!iq) return "—";
            switch (prayerKey) {
                case "Fajr": return getIqamahTime("fajr", prayerTimes.fajr, iq);
                case "Sunrise": return "—";
                case "Dhuhr": return getIqamahTime("dhuhr", prayerTimes.dhuhr, iq);
                case "Asr": return getIqamahTime("asr", prayerTimes.asr, iq);
                case "Maghrib": return getIqamahTime("maghrib", prayerTimes.maghrib, iq);
                case "Isha": return isSummer ? "After Maghrib" : getIqamahTime("isha", prayerTimes.isha, iq, prayerTimes.maghrib);
                case "Jummah": return iq.jummah || "—";
                default: return "—";
            }
        };
        const items = [
            { id: "fajr", label: "Fajr", adhan: prayerTimes.fajr, iqamah: getIqamah("Fajr") },
            { id: "sunrise", label: "Sunrise", adhan: prayerTimes.sunrise, iqamah: getIqamah("Sunrise") },
            {
                id: isFriday && iq?.jummah ? "jummah" : "dhuhr",
                label: isFriday && iq?.jummah ? "Jummah" : "Dhuhr",
                adhan: prayerTimes.dhuhr,
                iqamah: isFriday && iq?.jummah ? (iq.jummah || "—") : getIqamah("Dhuhr"),
            },
            { id: "asr", label: "Asr", adhan: prayerTimes.asr, iqamah: getIqamah("Asr") },
            { id: "maghrib", label: "Maghrib", adhan: prayerTimes.maghrib, iqamah: getIqamah("Maghrib") },
            { id: "isha", label: "Isha'a", adhan: prayerTimes.isha, iqamah: getIqamah("Isha") },
        ];
        return items;
    }, [prayerTimes, iqamahTimes, isSummer, isFriday]);

    const upcomingPrayer = useMemo(() => {
        if (!prayerTimes || !iqamahTimes || !isToday) return null;
        const now = sheffieldNow;
        const majorIndices = [0, 2, 3, 4, 5];
        const iqamahDates = prayers.map((p) => {
            if (p.iqamah === "-" || p.iqamah === "—" || p.iqamah === "After Maghrib") return null;
            const [h, m] = p.iqamah.split(":").map(Number);
            const d = new Date(now);
            d.setHours(h, m, 0, 0);
            return d;
        });
        let jummahDate: Date | null = null;
        if (isFriday && iqamahTimes.jummah && iqamahTimes.jummah !== "-") {
            const [h, m] = iqamahTimes.jummah.split(":").map(Number);
            jummahDate = new Date(now);
            jummahDate.setHours(h, m, 0, 0);
        }
        for (let i = 0; i < majorIndices.length; i++) {
            const currIdx = majorIndices[i];
            const prevIdx = majorIndices[i === 0 ? majorIndices.length - 1 : i - 1];
            const currentIqamahStart = isFriday && currIdx === 2 && jummahDate ? jummahDate : iqamahDates[currIdx];
            const prevIqamahEnd = isFriday && prevIdx === 2 && jummahDate ? jummahDate : iqamahDates[prevIdx];
            if (!currentIqamahStart || !prevIqamahEnd) continue;
            let startTime = new Date(prevIqamahEnd);
            if (i === 0) startTime.setDate(startTime.getDate() - 1);
            startTime.setMinutes(startTime.getMinutes() + 10);
            const endTime = currentIqamahStart;
            if (i === 0 && now < endTime && now >= startTime) return "fajr";
            if (now >= startTime && now < endTime) {
                if (isFriday && currIdx === 2) return "jummah";
                return prayers[currIdx].id;
            }
        }
        const ishaIqamah = iqamahDates[5];
        if (ishaIqamah) {
            const nextDayStart = new Date(ishaIqamah);
            nextDayStart.setMinutes(nextDayStart.getMinutes() + 10);
            if (now >= nextDayStart) return "fajr";
        }
        return null;
    }, [prayerTimes, iqamahTimes, prayers, isToday, isFriday, sheffieldNow]);

    // Determine current active background and curve (use Sheffield timezone so slider matches)
    const { bgClass } = useMemo(() => {
        let cls = "bg-[#0A1128]";

        const hourStr = currentTime.toLocaleTimeString("en-GB", { timeZone: SHEFFIELD_TZ, hour: "2-digit", hour12: false });
        const hour = parseInt(hourStr, 10);

        if (hour >= 5 && hour < 7) {
            // Sunrise: 5:00 - 7:00
            cls = "bg-gradient-to-b from-[#2e3159] via-[#8e5c77] to-[#f4935e]";
        } else if (hour >= 7 && hour < 11) {
            // Morning: 7:00 - 11:00
            cls = "bg-gradient-to-b from-[#5698d6] via-[#3a75b8] to-[#1e528e]";
        } else if (hour >= 11 && hour < 13) {
            // Noon: 11:00 - 13:00
            cls = "bg-gradient-to-b from-[#1ca3ec] via-[#1081cc] to-[#0459a3]";
        } else if (hour >= 13 && hour < 17) {
            // Afternoon: 13:00 - 17:00
            cls = "bg-gradient-to-b from-[#3876b5] via-[#2a5d96] to-[#1a4168]";
        } else if (hour >= 17 && hour < 19) {
            // Sunset: 17:00 - 19:00
            cls = "bg-gradient-to-b from-[#233568] via-[#8b3d6a] to-[#fd7534]";
        } else {
            // Night: 19:00 - 5:00
            cls = "bg-gradient-to-b from-[#0A1128] via-[#121c38] to-[#1A2642]";
        }

        return { bgClass: cls };
    }, [currentTime]);

    // Handle previous / Next day
    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d);
    };

    return (
        <div className="relative isolate flex h-full w-full flex-col font-sans transition-colors duration-1000 text-white min-h-[100dvh]">
            {/* Full-bleed background - extends to screen edges (iPhone bezels, notch) */}
            <div
                className={`fixed inset-0 z-0 pointer-events-none transition-colors duration-1000 ${bgClass}`}
                style={{
                    top: "calc(-1 * env(safe-area-inset-top, 0px))",
                    left: "calc(-1 * env(safe-area-inset-left, 0px))",
                    right: "calc(-1 * env(safe-area-inset-right, 0px))",
                    bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
                }}
            />
            {/* Stars background - deterministic positions to avoid hydration mismatch */}
            <div className="absolute top-0 left-0 w-full h-1/2 pointer-events-none">
                {[...Array(15)].map((_, i) => {
                    // Pseudo-random but deterministic from index (same on server and client)
                    const top = ((i * 31 + 7) % 97) + 1;
                    const left = ((i * 17 + 13) % 97) + 1;
                    const opacity = 0.2 + ((i * 11 + 3) % 80) / 100;
                    return (
                        <div key={i} className="absolute w-1 h-1 bg-white/60 rounded-full" style={{
                            top: `${top}%`,
                            left: `${left}%`,
                            opacity
                        }} />
                    );
                })}
            </div>

            <div className="flex-1 flex flex-col z-10 px-4 sm:px-5 md:px-6 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-0 overflow-hidden min-h-0">
                {/* Header */}
                <div className="text-white mb-3 sm:mb-5 md:mb-6 shrink-0 [text-shadow:0_1px_3px_rgba(0,0,0,0.5),0_0_8px_rgba(0,0,0,0.3)]">
                    <div className="flex justify-between items-center text-sm sm:text-base mb-3 sm:mb-4 font-normal">
                        <div className="flex-1 text-left font-normal text-white/90">
                            <div className="hidden sm:block">{formatDateForDisplay(currentTime)}</div>
                            <div className="sm:hidden text-xs">{formatDateForDisplay(currentTime).split(" ").slice(0, 3).join(" ")}</div>
                        </div>
                        <div className="flex-1 text-center font-bold">
                            <div className="text-base sm:text-lg">
                                {currentTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: SHEFFIELD_TZ })}
                            </div>
                        </div>
                        <div className="flex-1 text-right font-normal text-white/90">
                            <div className="hidden sm:block">{hijriDate}</div>
                            <div className="sm:hidden text-xs">{hijriDate.split(" ").slice(0, 2).join(" ")}</div>
                        </div>
                    </div>

                    {/* Countdown Section */}
                    <div className="text-center text-white font-sans">
                        {isToday && nextPrayer && countdown ? (
                            <>
                                <h2 className="text-base sm:text-xl lg:text-2xl mb-3 sm:mb-4 font-bold tracking-[0.15px]">
                                    {isJummahCountdown ? (
                                        <>The Khutbah of <span className="font-bold">JUMMAH</span> is in</>
                                    ) : isIqamahCountdown ? (
                                        <>The Iqamah of <span className="font-bold">{nextPrayer.name.toUpperCase()}</span> is in</>
                                    ) : (
                                        <>The Adhan of <span className="font-bold">{nextPrayer.name.toUpperCase()}</span> is in</>
                                    )}
                                </h2>
                                <div className="flex justify-center items-center gap-2 sm:gap-4 lg:gap-6">
                                    <button
                                        onClick={handlePrevDay}
                                        className="bg-transparent border-none p-0 min-w-0 text-white/75 hover:text-white transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded touch-manipulation"
                                        aria-label="Previous day"
                                    >
                                        <svg className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" /></svg>
                                    </button>

                                    <div className="flex justify-center items-center gap-2 sm:gap-3 lg:gap-5">
                                        <div className="flex flex-col items-center">
                                            <div className="text-3xl sm:text-5xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.hours.toString().padStart(2, "0")}</div>
                                            <div className="text-xs sm:text-sm uppercase tracking-widest text-[#FFB380]/70">Hours</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-1 sm:mb-2">:</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-3xl sm:text-5xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.minutes.toString().padStart(2, "0")}</div>
                                            <div className="text-xs sm:text-sm uppercase tracking-widest text-[#FFB380]/70">Minutes</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-2xl sm:text-4xl lg:text-6xl font-bold mb-1 sm:mb-2">:</div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="text-3xl sm:text-5xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.seconds.toString().padStart(2, "0")}</div>
                                            <div className="text-xs sm:text-sm uppercase tracking-widest text-[#FFB380]/70">Seconds</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleNextDay}
                                        className="bg-transparent border-none p-0 min-w-0 text-white/75 hover:text-white transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded touch-manipulation"
                                        aria-label="Next day"
                                    >
                                        <svg className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-center items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                                <button
                                    onClick={handlePrevDay}
                                    className="bg-transparent border-none p-0 min-w-0 text-white/75 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded touch-manipulation"
                                    aria-label="Previous day"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h2 className="text-base sm:text-xl lg:text-2xl font-bold text-center flex-1 min-w-0">
                                    Prayer Times for <span className="font-bold">{formatDateForDisplay(selectedDate)}</span>
                                </h2>
                                <button
                                    onClick={handleNextDay}
                                    className="bg-transparent border-none p-0 min-w-0 text-white/75 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded touch-manipulation"
                                    aria-label="Next day"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Prayer List - flex-1 fills space; cards expand to fill */}
                <div className="flex flex-1 flex-col gap-1.5 sm:gap-2 md:gap-3 min-h-0 overflow-hidden">
                    {/* Header row - same grid/padding as cards for alignment */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-center px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 text-[9px] sm:text-xs md:text-sm uppercase font-semibold tracking-widest text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6),0_0_6px_rgba(0,0,0,0.35)] shrink-0">
                        <div className="min-w-0">Adhan</div>
                        <div className="text-center min-w-0">Prayer</div>
                        <div className="text-right min-w-0">Iqamah</div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:gap-3 md:gap-4 min-h-0 overflow-hidden">
                    {prayers.map((prayer) => {
                        const isActive = prayer.id === (upcomingPrayer ?? currentPrayer);
                        return (
                            <div
                                key={prayer.id}
                                className="relative grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-center px-3 sm:px-4 md:px-5 lg:px-6 py-2 sm:py-2.5 md:py-3 min-h-[36px] flex-1 rounded-xl overflow-hidden transition-all duration-500"
                                style={{
                                    background: isActive
                                        ? "linear-gradient(145deg, rgba(255,179,128,0.36) 0%, rgba(255,154,103,0.22) 50%, rgba(255,120,60,0.12) 100%)"
                                        : "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                                    backdropFilter: "blur(20px) saturate(140%)",
                                    WebkitBackdropFilter: "blur(20px) saturate(140%)",
                                    boxShadow: isActive
                                        ? "inset 0 1px 0 rgba(255,235,214,0.6), inset 0 -1px 0 rgba(255,148,86,0.24), 0 0 0 1px rgba(255,179,128,0.5), 0 10px 24px rgba(255,133,56,0.18)"
                                        : "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(255,255,255,0.06)",
                                }}
                            >
                                {/* Specular top edge shimmer */}
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-0 left-4 right-4 h-px"
                                    style={{
                                        background: isActive
                                            ? "linear-gradient(90deg, transparent, rgba(255,225,196,0.6) 40%, rgba(255,255,255,0.78) 50%, rgba(255,225,196,0.6) 60%, transparent)"
                                            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.15) 60%, transparent)",
                                    }}
                                />

                                <span className={`relative z-10 min-w-0 text-sm sm:text-base md:text-lg font-medium tabular-nums truncate transition-colors duration-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.6),0_0_6px_rgba(0,0,0,0.35)] ${isActive ? "text-white font-bold" : "text-white/90"}`}>
                                    {prayer.adhan}
                                </span>
                                <span className={`relative z-10 min-w-0 text-center text-sm sm:text-base md:text-lg tracking-wide font-medium truncate transition-colors duration-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.6),0_0_6px_rgba(0,0,0,0.35)] ${isActive ? "text-[#FFE2CB] font-extrabold" : "text-white/95"}`}>
                                    {prayer.label}
                                </span>
                                <span className={`relative z-10 min-w-0 text-right text-sm sm:text-base md:text-lg font-bold tracking-tight tabular-nums truncate transition-colors duration-300 [text-shadow:0_1px_2px_rgba(0,0,0,0.6),0_0_6px_rgba(0,0,0,0.35)] ${isActive ? "text-white" : "text-white/90"}`}>
                                    {prayer.iqamah}
                                </span>
                            </div>
                        );
                    })}

                    {/* Jummah card - MWHS TV style */}
                    {iqamahTimes?.jummah && (
                        <div className="shrink-0">
                            <JummahWidget
                                jummahTime={iqamahTimes.jummah}
                                isActive={upcomingPrayer === "jummah"}
                                compact
                            />
                        </div>
                    )}
                    </div>
                </div>
            </div>

            <AppBottomNav activeTab="prayer" />
        </div>
    );
}
