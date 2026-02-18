export interface PrayerTime {
  date: number;
  fajr: string;
  shurooq: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface IqamahTimeRange {
  date_range: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib?: string;
  isha: string;
}

export interface MonthlyPrayerTimes {
  month: string;
  prayer_times: PrayerTime[];
  iqamah_times: IqamahTimeRange[];
  jummah_iqamah: string;
}

export interface DailyPrayerTimes {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface DailyIqamahTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jummah: string;
}

export interface Mosque {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  slug: string;
  website?: string;
} 