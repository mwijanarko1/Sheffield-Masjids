"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import JummahWidget from './JummahWidget';
import { CustomSelect } from './ui/custom-select';
import { getTodaysPrayerTimes, getTodaysIqamahTimes, getCurrentPrayer, getIqamahTime, formatDateForDisplay, getPrayerTimesForDate, getIqamahTimesForSpecificDate, getDateInSheffield, isDateInRamadanPeriod, isInDSTAdjustmentPeriod, getDSTAdjustmentIqamahDate, subtractOneHour, formatTo12Hour, isValidTimeForMarkup } from '@/lib/prayer-times';
import { DailyPrayerTimes, DailyIqamahTimes, Mosque } from '@/types/prayer-times';
import { Button } from '@/components/ui/button';

interface PrayerTimesWidgetProps {
  initialMosque: Mosque;
  showDropdown?: boolean;
  mosques?: Mosque[];
}

export default function PrayerTimesWidget({
  initialMosque,
  showDropdown = false,
  mosques = [],
}: PrayerTimesWidgetProps) {
  const [mosque, setMosque] = useState<Mosque>(initialMosque);
  const selectableMosques = mosques.length > 0 ? mosques : [initialMosque];

  // Sync mosque when parent passes a new initialMosque (e.g. from HomeContent dropdown)
  useEffect(() => {
    setMosque(initialMosque);
  }, [initialMosque]);
  const [prayerTimes, setPrayerTimes] = useState<DailyPrayerTimes | null>(null);
  const [iqamahTimes, setIqamahTimes] = useState<DailyIqamahTimes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrayer, setCurrentPrayer] = useState<string | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isIqamahCountdown, setIsIqamahCountdown] = useState(false);
  const [isJummahCountdown, setIsJummahCountdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const { year, month, day } = getDateInSheffield(new Date());
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  });
  const [dstSettings] = useState<{ enabled: boolean; customTimes: Record<string, string> } | null>(null);
  const [adjustedIqamahTimes, setAdjustedIqamahTimes] = useState<DailyIqamahTimes | null>(null);
  const [isRamadanPeriod, setIsRamadanPeriod] = useState(false);
  const latestFetchRequestRef = useRef(0);

  // Get Sheffield UK time
  const getSheffieldTime = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  };

  const isToday = useMemo(() => {
    const sel = getDateInSheffield(selectedDate);
    const now = getDateInSheffield(new Date());
    return sel.year === now.year && sel.month === now.month && sel.day === now.day;
  }, [selectedDate]);

  // Get the prayer that should be highlighted
  const getHighlightedPrayer = useCallback((prayers: any[]): string | null => {
    const now = getSheffieldTime();
    const isFriday = now.getDay() === 5;

    // Major prayer indices in the prayers array: FAJR(0), DHUHR(2), ASR(3), MAGHRIB(4), ISHA(5)
    const majorIndices = [0, 2, 3, 4, 5];
    const iqamahDates = prayers.map(p => {
      if (p.iqamah === '-' || p.iqamah === '--:--' || p.iqamah === 'After Maghrib') return null;
      const [hours, minutes] = p.iqamah.split(':').map(Number);
      const d = new Date(now);
      d.setHours(hours, minutes, 0, 0);
      return d;
    });

    // Add special handling for Jummah on Fridays
    let jummahDate: Date | null = null;
    if (isFriday && adjustedIqamahTimes?.jummah && adjustedIqamahTimes.jummah !== '-' && adjustedIqamahTimes.jummah !== '--:--') {
      const [hours, minutes] = adjustedIqamahTimes.jummah.split(':').map(Number);
      jummahDate = new Date(now);
      jummahDate.setHours(hours, minutes, 0, 0);
    }

    for (let i = 0; i < majorIndices.length; i++) {
      const currIdx = majorIndices[i];
      const prevIdx = majorIndices[i === 0 ? majorIndices.length - 1 : i - 1];

      // On Fridays, replace Dhuhr (index 2) iqamah date with Jummah iqamah date for the purpose of range checking
      const currentIqamahStart = (isFriday && currIdx === 2 && jummahDate) ? jummahDate : iqamahDates[currIdx];
      const prevIqamahEnd = (isFriday && prevIdx === 2 && jummahDate) ? jummahDate : iqamahDates[prevIdx];

      if (!currentIqamahStart || !prevIqamahEnd) continue;

      let startTime = new Date(prevIqamahEnd);
      if (i === 0) startTime.setDate(startTime.getDate() - 1); // Yesterday's Isha
      startTime.setMinutes(startTime.getMinutes() + 10);

      const endTime = currentIqamahStart;

      // If it's before Fajr today (but after yesterday's Isha + 10m), it's Fajr
      if (i === 0 && now < endTime && now >= startTime) return 'fajr';
      // Normal daytime checks
      if (now >= startTime && now < endTime) {
        if (isFriday && currIdx === 2) return 'jummah';
        return prayers[currIdx].name.toLowerCase();
      }
    }

    // Special case: After Isha iqamah + 10 mins, it highlights Fajr for tomorrow
    const ishaIqamah = iqamahDates[5];
    if (ishaIqamah) {
      const nextDayStart = new Date(ishaIqamah);
      nextDayStart.setMinutes(nextDayStart.getMinutes() + 10);
      if (now >= nextDayStart) return 'fajr';
    }

    return null;
  }, [adjustedIqamahTimes]);

  // Check if we're in the summer period (May 15 - August 15)
  const isSummerPeriod = useMemo(() => {
    const today = getSheffieldTime();
    const year = today.getFullYear();
    const may15 = new Date(year, 4, 15); // May is month 4 (0-indexed)
    const aug15 = new Date(year, 7, 15); // August is month 7 (0-indexed)

    return today >= may15 && today <= aug15;
  }, []);

  // Get next prayer/iqamah and calculate countdown
  const getNextPrayerAndCountdown = useCallback(async (prayerTimes: DailyPrayerTimes, iqamahTimes: DailyIqamahTimes, selectedDate?: Date) => {
    const now = getSheffieldTime();
    const isDSTModeEnabled = dstSettings?.enabled;
    const checkDate = selectedDate || new Date();
    const inDSTAdjustment = await isInDSTAdjustmentPeriod(checkDate);
    const isFriday = checkDate.getDay() === 5;

    // Apply time adjustment only to Dhuhr and Maghrib during DST adjustment periods
    const adjustedPrayerTimes = (inDSTAdjustment) ? {
      ...prayerTimes,
      dhuhr: subtractOneHour(prayerTimes.dhuhr), // Fallback simplification for now
      maghrib: subtractOneHour(prayerTimes.maghrib),
    } : prayerTimes;

    const useCustomIqamahTimes = isDSTModeEnabled && inDSTAdjustment;

    const prayers = [
      {
        name: 'Fajr',
        adhanTime: adjustedPrayerTimes.fajr,
        iqamahTime: useCustomIqamahTimes && dstSettings?.customTimes.fajr ? dstSettings.customTimes.fajr : getIqamahTime('fajr', adjustedPrayerTimes.fajr, iqamahTimes)
      },
      {
        name: isFriday ? 'Jummah' : 'Dhuhr',
        adhanTime: adjustedPrayerTimes.dhuhr,
        iqamahTime: isFriday ? (iqamahTimes.jummah || '-') : (useCustomIqamahTimes && dstSettings?.customTimes.dhuhr ? dstSettings.customTimes.dhuhr : getIqamahTime('dhuhr', adjustedPrayerTimes.dhuhr, iqamahTimes))
      },
      {
        name: 'Asr',
        adhanTime: adjustedPrayerTimes.asr,
        iqamahTime: useCustomIqamahTimes && dstSettings?.customTimes.asr ? dstSettings.customTimes.asr : getIqamahTime('asr', adjustedPrayerTimes.asr, iqamahTimes)
      },
      { name: 'Maghrib', adhanTime: adjustedPrayerTimes.maghrib, iqamahTime: getIqamahTime('maghrib', adjustedPrayerTimes.maghrib, iqamahTimes) },
      {
        name: 'Isha',
        adhanTime: adjustedPrayerTimes.isha,
        iqamahTime: (() => {
          if (useCustomIqamahTimes && dstSettings?.customTimes.isha) {
            return dstSettings.customTimes.isha;
          }
          if (isSummerPeriod) {
            return 'After Maghrib';
          }
          return getIqamahTime('isha', adjustedPrayerTimes.isha, iqamahTimes);
        })()
      },
    ];

    for (const prayer of prayers) {
      const isJummah = prayer.name === 'Jummah';

      if (!isJummah) {
        const [adhanHours, adhanMinutes] = prayer.adhanTime.split(':').map(Number);
        const adhanTime = new Date(now);
        adhanTime.setHours(adhanHours, adhanMinutes, 0, 0);

        if (adhanTime > now) {
          const timeDiff = adhanTime.getTime() - now.getTime();
          return {
            nextPrayer: { name: prayer.name, time: prayer.adhanTime },
            countdown: {
              hours: Math.floor(timeDiff / (1000 * 60 * 60)),
              minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((timeDiff % (1000 * 60)) / 1000)
            },
            isIqamah: false
          };
        }
      }

      if (prayer.iqamahTime !== '-' && prayer.iqamahTime !== '--:--' && prayer.iqamahTime !== prayer.adhanTime && prayer.iqamahTime !== 'After Maghrib') {
        const [iqamahHours, iqamahMinutes] = prayer.iqamahTime.split(':').map(Number);
        const iqamahTime = new Date(now);
        iqamahTime.setHours(iqamahHours, iqamahMinutes, 0, 0);

        if (iqamahTime > now) {
          const timeDiff = iqamahTime.getTime() - now.getTime();
          return {
            nextPrayer: { name: prayer.name, time: prayer.iqamahTime },
            countdown: {
              hours: Math.floor(timeDiff / (1000 * 60 * 60)),
              minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((timeDiff % (1000 * 60)) / 1000)
            },
            isIqamah: true,
            isJummah: isJummah
          };
        }
      }
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = prayers[0].adhanTime.split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);

    const timeDiff = tomorrow.getTime() - now.getTime();
    return {
      nextPrayer: { name: 'Fajr', time: prayers[0].adhanTime },
      countdown: {
        hours: Math.floor(timeDiff / (1000 * 60 * 60)),
        minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((timeDiff % (1000 * 60)) / 1000)
      },
      isIqamah: false
    };
  }, [dstSettings, isSummerPeriod]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const isJummahDay = useMemo(() => {
    return true; // Show Jummah widget all days of the week
  }, []);

  useEffect(() => {
    const requestId = ++latestFetchRequestRef.current;
    let isActive = true;
    const isCurrentRequest = () =>
      isActive && latestFetchRequestRef.current === requestId;

    const fetchPrayerTimes = async () => {
      try {
        if (prayerTimes === null) setIsLoading(true);
        else setIsTransitioning(true);
        setError(null);

        const dstIqamahDate = await getDSTAdjustmentIqamahDate(selectedDate);
        const [prayerTimesForDate, iqamahTimesForDate] = await Promise.all([
          isToday ? getTodaysPrayerTimes(mosque.slug) : getPrayerTimesForDate(mosque.slug, selectedDate),
          isToday ? getTodaysIqamahTimes(mosque.slug) : getIqamahTimesForSpecificDate(mosque.slug, selectedDate)
        ]);

        if (!isCurrentRequest()) return;

        let finalIqamahTimes = iqamahTimesForDate;
        if (dstIqamahDate) {
          try {
            const adjustmentDate = new Date(selectedDate.getFullYear(), dstIqamahDate.month - 1, dstIqamahDate.date);
            finalIqamahTimes = await getIqamahTimesForSpecificDate(mosque.slug, adjustmentDate);
          } catch (e) { }
        }

        if (!isCurrentRequest()) return;

        setAdjustedIqamahTimes(finalIqamahTimes);
        setPrayerTimes(prayerTimesForDate);
        setIqamahTimes(iqamahTimesForDate);

        if (isToday) {
          const result = await getNextPrayerAndCountdown(prayerTimesForDate, finalIqamahTimes, selectedDate);
          if (!isCurrentRequest()) return;
          setCurrentPrayer(getCurrentPrayer(prayerTimesForDate));
          setNextPrayer(result.nextPrayer);
          setCountdown(result.countdown);
          setIsIqamahCountdown(result.isIqamah);
          setIsJummahCountdown(result.isJummah || false);
        } else {
          setCurrentPrayer(null);
          setNextPrayer(null);
          setCountdown(null);
        }
      } catch (err) {
        if (!isCurrentRequest()) return;

        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('RAMADAN_ONLY:')) {
          const range = msg.replace('RAMADAN_ONLY:', '');
          setError(`Prayer times for ${mosque.name} are available during Ramadan only (${range}).`);
        } else {
          setError(`Data not available for ${mosque.name} for this period.`);
        }
      } finally {
        if (!isCurrentRequest()) return;
        setIsLoading(false);
        setIsTransitioning(false);
      }
    };

    fetchPrayerTimes();

    return () => {
      isActive = false;
    };
  }, [selectedDate, isToday, mosque]);

  useEffect(() => {
    if (!prayerTimes || !iqamahTimes || !isToday) return;

    const interval = setInterval(async () => {
      const result = await getNextPrayerAndCountdown(prayerTimes, adjustedIqamahTimes || iqamahTimes!, selectedDate);
      setNextPrayer(result.nextPrayer);
      setCountdown(result.countdown);
      setIsIqamahCountdown(result.isIqamah);
      setIsJummahCountdown(result.isJummah || false);
      setCurrentPrayer(getCurrentPrayer(prayerTimes));
    }, 1000);

    return () => clearInterval(interval);
  }, [prayerTimes, iqamahTimes, isToday, mosque, adjustedIqamahTimes, getNextPrayerAndCountdown, selectedDate]);

  useEffect(() => {
    let isMounted = true;

    const checkRamadanPeriod = async () => {
      try {
        const inRange = await isDateInRamadanPeriod(mosque.slug, selectedDate);
        if (isMounted) setIsRamadanPeriod(inRange);
      } catch {
        if (isMounted) setIsRamadanPeriod(false);
      }
    };

    checkRamadanPeriod();

    return () => {
      isMounted = false;
    };
  }, [mosque.slug, selectedDate]);

  const prayers = useMemo(() => {
    if (!prayerTimes || !adjustedIqamahTimes) return [];

    // Simplification for adjustment period fallback
    const adjustedPT = prayerTimes;
    const iqamahToUse = adjustedIqamahTimes;

    const getIshaIqamah = () => {
      if (isSummerPeriod) return 'After Maghrib';
      return getIqamahTime('isha', adjustedPT.isha, iqamahToUse, adjustedPT.maghrib);
    };

    return [
      { name: 'FAJR', adhan: adjustedPT.fajr, iqamah: getIqamahTime('fajr', adjustedPT.fajr, iqamahToUse) },
      { name: 'SUNRISE', adhan: adjustedPT.sunrise, iqamah: '--:--' },
      { name: 'DHUHR', adhan: adjustedPT.dhuhr, iqamah: getIqamahTime('dhuhr', adjustedPT.dhuhr, iqamahToUse) },
      { name: 'ASR', adhan: adjustedPT.asr, iqamah: getIqamahTime('asr', adjustedPT.asr, iqamahToUse) },
      { name: 'MAGHRIB', adhan: adjustedPT.maghrib, iqamah: getIqamahTime('maghrib', adjustedPT.maghrib, iqamahToUse) },
      { name: 'ISHA', adhan: adjustedPT.isha, iqamah: getIshaIqamah() }
    ];
  }, [prayerTimes, adjustedIqamahTimes, isSummerPeriod]);

  const upcomingPrayer = useMemo(() => {
    if (!prayerTimes || !isToday || prayers.length === 0) return null;
    return getHighlightedPrayer(prayers);
  }, [prayers, isToday, getHighlightedPrayer, prayerTimes]);

  if (isLoading) {
    return <div className="p-12 text-center text-white bg-white/10 rounded-2xl animate-pulse backdrop-blur-md">Loading {mosque.name}…</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl shadow-lg sm:rounded-2xl sm:shadow-xl xl:rounded-3xl bg-gradient-to-b from-white/10 via-white/5 via-[15%] to-transparent backdrop-blur-md border border-white/20 sm:border-2">
      <div className="relative p-3 text-white/80 sm:p-6 xl:p-8">
        {showDropdown && (
          <div className="mb-4 sm:mb-6 flex justify-center">
            <CustomSelect
              options={selectableMosques}
              value={mosque.id}
              onChange={(value) => {
                const selected = selectableMosques.find(m => m.id === value);
                if (selected) setMosque(selected);
              }}
              className="max-w-[280px] sm:min-w-[250px]"
              ariaLabel="Select mosque"
            />
          </div>
        )}

        <div className="text-center text-white">
          {isToday && nextPrayer && countdown ? (
            <>
              <h2 className="mb-3 px-1 text-sm font-bold leading-tight tracking-tight sm:mb-4 sm:text-base md:text-lg xl:text-xl">
                {isJummahCountdown ? (
                  <>Khutbah of <span className="text-[#FFB380]">JUMMAH</span> in</>
                ) : isIqamahCountdown ? (
                  <>Iqamah of <span className="text-[#FFB380]">{nextPrayer.name.toUpperCase()}</span> in</>
                ) : (
                  <>Adhan of <span className="text-[#FFB380]">{nextPrayer.name.toUpperCase()}</span> in</>
                )}
              </h2>
              <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 xl:gap-5">
                <button onClick={goToPreviousDay} className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white active:text-white transition-colors touch-manipulation" aria-label="Previous day">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.hours.toString().padStart(2, '0')}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#FFB380]/70">hr</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4">:</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.minutes.toString().padStart(2, '0')}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#FFB380]/70">min</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4">:</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.seconds.toString().padStart(2, '0')}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#FFB380]/70">sec</div>
                  </div>
                </div>
                <button onClick={goToNextDay} className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white active:text-white transition-colors touch-manipulation" aria-label="Next day">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-center items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <button onClick={goToPreviousDay} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white active:text-white transition-colors touch-manipulation" aria-label="Previous day">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="flex-1 min-w-0 text-center text-sm font-bold sm:text-base md:text-lg xl:text-xl">Prayer Times for {formatDateForDisplay(selectedDate)}</h2>
              <button onClick={goToNextDay} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white active:text-white transition-colors touch-manipulation" aria-label="Next day">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-6 md:p-8 xl:p-10">
        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="p-6 sm:p-12 text-center text-white bg-white/5 rounded-xl border border-white/10 text-sm sm:text-base"
          >
            {error}
          </div>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-3 items-center border-b border-white/10 px-4 pb-2 sm:mb-4 sm:px-6 xl:px-8">
              <div className="text-left text-[10px] font-bold uppercase tracking-widest text-white/40 sm:text-xs">
                Prayer
              </div>
              <div className="text-center text-[10px] font-bold uppercase tracking-widest text-white/40 sm:text-xs">
                Adhan
              </div>
              <div className="text-right text-[10px] font-bold uppercase tracking-widest text-white/40 sm:text-xs">
                Iqamah
              </div>
            </div>

            <div className={`mb-4 flex flex-col gap-2 transition-all duration-300 sm:mb-6 sm:gap-3 xl:gap-4 ${isTransitioning ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'}`}>
              {prayers.map((prayer) => {
                const isUpcoming = upcomingPrayer === prayer.name.toLowerCase();
                return (
                  <div
                    key={prayer.name}
                    className={`flex items-center rounded-xl sm:rounded-2xl transition-all duration-300 shadow-md ${isUpcoming
                      ? 'bg-gradient-to-r from-[#FFB380]/20 to-[#FFB380]/5 text-white ring-1 ring-white/20 scale-[1.02] shadow-xl z-10'
                      : 'bg-gradient-to-br from-white/10 to-transparent text-white/80'
                      }`}
                  >
                    <div className="grid w-full grid-cols-3 items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 xl:px-8 xl:py-5">
                      <div className="flex flex-col items-start">
                        <div className={`text-sm font-serif font-bold italic capitalize sm:text-base md:text-xl xl:text-2xl ${isUpcoming ? 'text-white' : 'text-white/80'}`}>
                          {prayer.name.toLowerCase()}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="text-lg font-sans font-black leading-none tracking-tighter sm:text-2xl md:text-3xl xl:text-4xl">
                          {isValidTimeForMarkup(prayer.adhan) ? (
                            <time dateTime={prayer.adhan}>{formatTo12Hour(prayer.adhan)}</time>
                          ) : (
                            formatTo12Hour(prayer.adhan)
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-lg font-sans font-black leading-none tracking-tighter sm:text-2xl md:text-3xl xl:text-4xl">
                          {prayer.name === 'SUNRISE' ? (
                            '--:--'
                          ) : prayer.iqamah === '-' ? (
                            '--:--'
                          ) : isValidTimeForMarkup(prayer.iqamah) ? (
                            <time dateTime={prayer.iqamah}>{formatTo12Hour(prayer.iqamah)}</time>
                          ) : (
                            formatTo12Hour(prayer.iqamah)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {(isJummahDay || isSummerPeriod) && (
          <div className="mb-4 flex gap-3 sm:gap-4 flex-wrap sm:flex-nowrap sm:mb-6">
            {isJummahDay && (
              <div className="flex-1 min-w-[200px]">
                <JummahWidget
                  jummahTime={adjustedIqamahTimes?.jummah || ''}
                  isActive={upcomingPrayer === 'jummah'}
                />
              </div>
            )}
            {isSummerPeriod && (
              <div className="flex-1 min-w-[200px] bg-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-center items-center text-center backdrop-blur-sm border border-white/10 shadow-lg">
                <p className="text-[10px] sm:text-xs font-medium font-serif italic text-white/40 uppercase tracking-widest mb-0.5 sm:mb-1">
                  Summer Schedule
                </p>
                <p className="text-sm sm:text-base md:text-lg text-white font-bold">
                  Maghrib & Isha combined
                </p>
              </div>
            )}
          </div>
        )}

        {isRamadanPeriod ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              asChild
              variant="secondary"
              className="w-full min-h-[44px] touch-manipulation bg-gradient-to-br from-white/10 to-transparent text-white hover:bg-white/20 shadow-md border border-white/20 backdrop-blur-md"
            >
              <Link href={`/mosques/${mosque.slug}/timetable`}>
                View full month timetable
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="w-full min-h-[44px] touch-manipulation bg-gradient-to-br from-white/10 to-transparent text-white hover:bg-white/20 shadow-md border border-white/20 backdrop-blur-md"
            >
              <Link href={`/mosques/${mosque.slug}/ramadan-timetable`}>
                View Ramadan timetable
              </Link>
            </Button>
          </div>
        ) : (
          <Button
            asChild
            variant="secondary"
            className="w-full min-h-[44px] touch-manipulation bg-gradient-to-br from-white/10 to-transparent text-white hover:bg-white/20 shadow-md border border-white/20 backdrop-blur-md"
          >
            <Link href={`/mosques/${mosque.slug}/timetable`}>
              View full month timetable
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
