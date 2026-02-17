"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import moment from 'moment-hijri';
import JummahWidget from './JummahWidget';
import { getTodaysPrayerTimes, getTodaysIqamahTimes, getCurrentPrayer, getIqamahTime, formatDateForDisplay, getPrayerTimesForDate, getIqamahTimesForSpecificDate, getDSTSettingsFromFirestore, isInDSTPeriodSync as isInDSTPeriod, adjustPrayerTimeForDSTSync as adjustPrayerTimeForDST, isInDSTAdjustmentPeriod, isInDSTAdjustmentPeriodSync, getDSTAdjustmentIqamahDate, subtractOneHour } from '@/lib/prayer-times';
import { DailyPrayerTimes, DailyIqamahTimes, Mosque } from '@/types/prayer-times';
import mosquesData from '../../public/data/mosques.json';

interface PrayerTimesWidgetProps {
  initialMosque: Mosque;
  showDropdown?: boolean;
}

export default function PrayerTimesWidget({ initialMosque, showDropdown = false }: PrayerTimesWidgetProps) {
  const [mosque, setMosque] = useState<Mosque>(initialMosque);

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
  const [currentTime, setCurrentTime] = useState(() => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" })));
  const [hijriDate, setHijriDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(() => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" })));
  const [dstSettings, setDstSettings] = useState<{ enabled: boolean; customTimes: Record<string, string> } | null>(null);
  const [adjustedIqamahTimes, setAdjustedIqamahTimes] = useState<DailyIqamahTimes | null>(null);
  const [dstData, setDstData] = useState<any>(null);

  // Get Sheffield UK time
  const getSheffieldTime = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  };

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

  const getHijriDate = (date: Date = new Date()) => {
    try {
      const hijriMoment = moment(date);
      const hijriDay = hijriMoment.iDate();
      const hijriYear = hijriMoment.iYear();
      const hijriMonthNum = hijriMoment.iMonth();
      const hijriMonthsEnglish = [
        'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
        'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
        'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
      ];
      return `${hijriDay} ${hijriMonthsEnglish[hijriMonthNum]} ${hijriYear}`;
    } catch (error) {
      return 'Hijri date unavailable';
    }
  };

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

  const isToday = useMemo(() => {
    const today = getSheffieldTime();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const isJummahDay = useMemo(() => {
    return selectedDate.getDay() === 5; // Friday is day 5
  }, [selectedDate]);

  useEffect(() => {
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

        let finalIqamahTimes = iqamahTimesForDate;
        if (dstIqamahDate) {
          try {
            const adjustmentDate = new Date(selectedDate.getFullYear(), dstIqamahDate.month - 1, dstIqamahDate.date);
            finalIqamahTimes = await getIqamahTimesForSpecificDate(mosque.slug, adjustmentDate);
          } catch (e) {}
        }

        setAdjustedIqamahTimes(finalIqamahTimes);
        setPrayerTimes(prayerTimesForDate);
        setIqamahTimes(iqamahTimesForDate);

        if (isToday) {
          setCurrentPrayer(getCurrentPrayer(prayerTimesForDate));
          setHijriDate(getHijriDate(selectedDate));
          const result = await getNextPrayerAndCountdown(prayerTimesForDate, finalIqamahTimes, selectedDate);
          setNextPrayer(result.nextPrayer);
          setCountdown(result.countdown);
          setIsIqamahCountdown(result.isIqamah);
          setIsJummahCountdown(result.isJummah || false);
        } else {
          setCurrentPrayer(null);
          setNextPrayer(null);
          setCountdown(null);
          setHijriDate(getHijriDate(selectedDate));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('RAMADAN_ONLY:')) {
          const range = msg.replace('RAMADAN_ONLY:', '');
          setError(`Prayer times for ${mosque.name} are available during Ramadan only (${range}).`);
        } else {
          setError(`Data not available for ${mosque.name} for this period.`);
        }
      } finally {
        setIsLoading(false);
        setIsTransitioning(false);
      }
    };

    fetchPrayerTimes();
  }, [selectedDate, isToday, mosque]);

  useEffect(() => {
    if (!prayerTimes || !iqamahTimes || !isToday) return;

    const interval = setInterval(async () => {
      setCurrentTime(getSheffieldTime());
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
    const loadDSTData = async () => {
      try {
        const response = await fetch('/docs/dst-start-end.json');
        if (response.ok) setDstData(await response.json());
      } catch (e) {}
    };
    loadDSTData();
  }, []);

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
      { name: 'MAGHRIB', adhan: adjustedPT.maghrib, iqamah: adjustedPT.maghrib },
      { name: 'ISHA', adhan: adjustedPT.isha, iqamah: getIshaIqamah() }
    ];
  }, [prayerTimes, adjustedIqamahTimes, isSummerPeriod]);

  const upcomingPrayer = useMemo(() => {
    if (!prayerTimes || !isToday || prayers.length === 0) return null;
    return getHighlightedPrayer(prayers);
  }, [prayers, isToday, getHighlightedPrayer, prayerTimes]);

  if (isLoading) {
    return <div className="p-12 text-center text-white bg-[var(--theme-primary)] rounded-2xl animate-pulse">Loading {mosque.name}...</div>;
  }

  return (
    <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl bg-gradient-to-b from-[var(--theme-primary)] via-[var(--theme-primary)] via-[15%] to-[var(--theme-accent)] border border-white/40 sm:border-2 sm:border-white/60">
      <div className="text-white/80 p-3 sm:p-6 relative">
        {showDropdown && (
          <div className="mb-4 sm:mb-6 flex justify-center">
            <select 
              value={mosque.id} 
              onChange={(e) => {
                const selected = mosquesData.mosques.find(m => m.id === e.target.value);
                if (selected) setMosque(selected as Mosque);
              }}
              className="w-full max-w-[280px] sm:min-w-[250px] bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 sm:py-2 text-base font-bold outline-none focus:ring-2 focus:ring-white/50 cursor-pointer appearance-none text-center touch-manipulation min-h-[44px]"
              aria-label="Select mosque"
            >
              {mosquesData.mosques.map(m => (
                <option key={m.id} value={m.id} className="text-gray-900 bg-white">{m.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-between items-center gap-2 text-[10px] sm:text-xs mb-3 sm:mb-4">
          <div className="flex-1 min-w-0 text-left text-[var(--theme-accent-light)] truncate">{formatDateForDisplay(currentTime)}</div>
          <div className="flex-shrink-0 font-bold text-sm sm:text-base">
            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex-1 min-w-0 text-right text-[var(--theme-accent-light)] truncate">{hijriDate}</div>
        </div>

        <div className="text-center text-white">
          {isToday && nextPrayer && countdown ? (
            <>
              <h2 className="text-sm sm:text-base md:text-lg mb-3 sm:mb-4 font-bold tracking-tight leading-tight px-1">
                {isJummahCountdown ? (
                  <>Khutbah of <span className="text-[var(--theme-highlight-bright)]">JUMMAH</span> in</>
                ) : isIqamahCountdown ? (
                  <>Iqamah of <span className="text-[var(--theme-highlight-bright)]">{nextPrayer.name.toUpperCase()}</span> in</>
                ) : (
                  <>Adhan of <span className="text-[var(--theme-highlight-bright)]">{nextPrayer.name.toUpperCase()}</span> in</>
                )}
              </h2>
              <div className="flex justify-center items-center gap-1 sm:gap-2 md:gap-4">
                <button onClick={goToPreviousDay} className="p-2 -m-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white active:text-white transition-colors touch-manipulation" aria-label="Previous day">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex items-end gap-0.5 sm:gap-1 md:gap-2">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.hours.toString().padStart(2, '0')}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[var(--theme-accent-light)]">hr</div>
                  </div>
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold pb-2 sm:pb-4">:</div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.minutes.toString().padStart(2, '0')}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[var(--theme-accent-light)]">min</div>
                  </div>
                  <div className="text-2xl sm:text-4xl md:text-5xl font-bold pb-2 sm:pb-4">:</div>
                  <div className="flex flex-col items-center">
                    <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tabular-nums tracking-tighter">{countdown.seconds.toString().padStart(2, '0')}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[var(--theme-accent-light)]">sec</div>
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
              <h2 className="text-sm sm:text-base md:text-lg font-bold text-center flex-1 min-w-0">Prayer Times for {formatDateForDisplay(selectedDate)}</h2>
              <button onClick={goToNextDay} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/40 hover:text-white active:text-white transition-colors touch-manipulation" aria-label="Next day">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-6 md:p-8">
        {error ? (
          <div className="p-6 sm:p-12 text-center text-white bg-white/5 rounded-xl border border-white/10 text-sm sm:text-base">{error}</div>
        ) : (
          <div className={`flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-6 transition-all duration-300 ${isTransitioning ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'}`}>
            {prayers.map((prayer) => {
              const isUpcoming = upcomingPrayer === prayer.name.toLowerCase();
              return (
                <div
                  key={prayer.name}
                  className={`flex items-center rounded-xl sm:rounded-2xl transition-all duration-300 shadow-md ${isUpcoming
                    ? 'bg-[var(--theme-primary)] text-white ring-2 ring-white/20 scale-[1.02] shadow-xl z-10'
                    : 'bg-gradient-to-br from-white to-[var(--theme-accent)] text-[var(--theme-primary)]'
                  }`}
                >
                  <div className="grid grid-cols-3 items-center w-full px-4 sm:px-6 py-3 sm:py-4 gap-2">
                    <div className="flex flex-col items-start">
                      <div className="text-[10px] sm:text-xs font-medium font-serif italic opacity-60 mb-0.5">Adhan</div>
                      <div className="text-lg sm:text-2xl md:text-3xl font-sans font-black tracking-tighter leading-none">
                        {prayer.adhan}
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`text-sm sm:text-base md:text-xl font-bold font-serif italic capitalize ${isUpcoming ? 'text-white' : 'text-[var(--theme-primary)]'}`}>
                        {prayer.name.toLowerCase()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-[10px] sm:text-xs font-medium font-serif italic opacity-60 mb-0.5">
                        {prayer.name === 'SUNRISE' ? '' : 'Iqamah'}
                      </div>
                      <div className="text-lg sm:text-2xl md:text-3xl font-sans font-black tracking-tighter leading-none">
                        {prayer.name === 'SUNRISE' ? '--:--' : (prayer.iqamah === '-' ? '--:--' : prayer.iqamah)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isJummahDay && (
          <JummahWidget 
            jummahTime={adjustedIqamahTimes?.jummah || ''} 
            isActive={upcomingPrayer === 'jummah'} 
          />
        )}
      </div>
    </div>
  );
}
