export type Difficulty = "easy" | "medium" | "hard";

export { RAMADAN_START_DATE, getCurrentRamadanNight } from "@/lib/ramadan-night";

export const DIFFICULTY_TABS: Difficulty[] = ["easy", "medium", "hard"];

export interface LastTenChecklistItem {
  id: string;
  difficulty: Difficulty[];
  actionPoint: string;
  actionPointAr: string;
  /** Override action point text per difficulty when it varies (e.g. salawat count). */
  actionPointByDifficulty?: Partial<Record<Difficulty, string>>;
  actionPointArByDifficulty?: Partial<Record<Difficulty, string>>;
  benefit: string;
  benefitAr: string;
  source: string;
  sourceAr: string;
  link?: string;
  charityLink?: string;
}

export type LastTenChecklistState = Record<string, Record<string, boolean>>;

export const LAST_TEN_STORAGE_KEY = "sheffield-masjids:last-ten-checklist:v1";
export const LAST_TEN_WELCOME_KEY = "sheffield-masjids:last-ten-welcome-seen:v1";

export const LAST_TEN_NIGHTS = [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] as const;

export const LAST_TEN_ITEMS: LastTenChecklistItem[] = [
  {
    id: "daily-charity",
    difficulty: ["easy", "medium", "hard"],
    actionPoint: "Give in charity, even a small amount.",
    actionPointAr: "تصدق ولو بالقليل",
    benefit: "Allah (تبارك وتعالى) guarantees that charity is multiplied for the giver and yields an honorable reward.",
    benefitAr: "وعد الله تبارك وتعالى أن الصدقة تضاعف لصاحبها وله أجر كريم",
    source: "Allah (تبارك وتعالى) states in the Quran: 'Indeed, those men and women who give in charity and lend to Allah a good loan will have it multiplied for them, and they will have an honorable reward' (Surah Al-Hadid 57:18).",
    sourceAr: "قال الله تبارك وتعالى في القرآن الكريم: (إِنَّ ٱلْمُصَّدِّقِينَ وَٱلْمُصَّدِّقَـٰتِ وَأَقْرَضُوا۟ ٱللَّهَ قَرْضًا حَسَنًۭا يُضَـٰعَفُ لَهُمْ وَلَهُمْ أَجْرٌۭ كَرِيمٌۭ) سورة الحديد ١٨",
    link: "https://quran.com/57:18",
    charityLink: "https://www.as-salaamfoundation.co.uk/appeals/1for1-appeal-2026/",
  },
  {
    id: "surah-ikhlas-three-times",
    difficulty: ["easy", "medium", "hard"],
    actionPoint: "Recite Surat Al-Ikhlas three times.",
    actionPointAr: "اقرأ (سورة الإخلاص) 3 مرات",
    benefit: "It is reported to be equivalent to reciting the entire Qur'an.",
    benefitAr: "ورد أنه يعدل قراءة القرآن الكريم كاملا",
    source: "Imam Muslim reports in his Sahih on the authority of Abu al-Darda' that the Messenger of Allah ﷺ is reported to have said: 'Is any of you unable to recite a third of the Qur'an in one night?' adding that 'Say: He is Allah, One' is described as equivalent to one-third of the Qur'an.",
    sourceAr: "رواه الإمام مسلم في صحيحه (811a) عن أبي الدرداء رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (أَيَعْجِزُ أَحَدُكُمْ أَنْ يَقْرَأَ فِي لَيْلَةٍ ثُلُثَ الْقُرْآنِ؟) وقال: (قُلْ هُوَ اللَّه أَحَدٌ تَعْدِلُ ثُلُثَ الْقُرْآنِ)",
    link: "https://sunnah.com/muslim:811a",
  },
  {
    id: "blessings-on-prophet-5",
    difficulty: ["easy"],
    actionPoint: "Send 5 salawat upon the Prophet ﷺ.",
    actionPointAr: "صلِّ على النبي صلى الله عليه وسلم ٥ مرات",
    benefit: "It is reported that for every single salawat sent, Allah (تبارك وتعالى) sends ten blessings upon the individual.",
    benefitAr: "ورد أن من صلى على النبي صلى الله عليه وسلم واحدة صلى الله عليه بها عشراً",
    source: "Imam Muslim reports in his Sahih on the authority of Abu Hurayrah that the Messenger of Allah ﷺ is reported to have said: 'Whoever sends blessings upon me once, Allah (تبارك وتعالى) will send blessings upon him ten times.'",
    sourceAr: "رواه الإمام مسلم في صحيحه (408) عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى الله عَلَيْهِ عَشْرًا)",
    link: "https://sunnah.com/muslim:408",
  },
  {
    id: "blessings-on-prophet-20",
    difficulty: ["medium"],
    actionPoint: "Send 20 salawat upon the Prophet ﷺ.",
    actionPointAr: "صلِّ على النبي صلى الله عليه وسلم ٢٠ مرة",
    benefit: "It is reported that for every single salawat sent, Allah (تبارك وتعالى) sends ten blessings upon the individual.",
    benefitAr: "ورد أن من صلى على النبي صلى الله عليه وسلم واحدة صلى الله عليه بها عشراً",
    source: "Imam Muslim reports in his Sahih on the authority of Abu Hurayrah that the Messenger of Allah ﷺ is reported to have said: 'Whoever sends blessings upon me once, Allah (تبارك وتعالى) will send blessings upon him ten times.'",
    sourceAr: "رواه الإمام مسلم في صحيحه (408) عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى الله عَلَيْهِ عَشْرًا)",
    link: "https://sunnah.com/muslim:408",
  },
  {
    id: "blessings-on-prophet-100",
    difficulty: ["hard"],
    actionPoint: "Send 100 salawat upon the Prophet ﷺ.",
    actionPointAr: "صلِّ على النبي صلى الله عليه وسلم ١٠٠ مرة",
    benefit: "It is reported that for every single salawat sent, Allah (تبارك وتعالى) sends ten blessings upon the individual.",
    benefitAr: "ورد أن من صلى على النبي صلى الله عليه وسلم واحدة صلى الله عليه بها عشراً",
    source: "Imam Muslim reports in his Sahih on the authority of Abu Hurayrah that the Messenger of Allah ﷺ is reported to have said: 'Whoever sends blessings upon me once, Allah (تبارك وتعالى) will send blessings upon him ten times.'",
    sourceAr: "رواه الإمام مسلم في صحيحه (408) عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى الله عَلَيْهِ عَشْرًا)",
    link: "https://sunnah.com/muslim:408",
  },
  {
    id: "last-verses-baqarah",
    difficulty: ["medium", "hard"],
    actionPoint: "Recite the final two verses of Surat Al-Baqarah.",
    actionPointAr: "اقرأ الآيتين من آخر سورة البقرة",
    benefit: "It is reported that these verses are sufficient for the one who recites them at night.",
    benefitAr: "ورد أنهما تكفيان من قرأهما في ليلة",
    source: "Imam al-Bukhari reports in his Sahih on the authority of Abu Mas'ud that the Messenger of Allah ﷺ is reported to have said: 'Whoever recites the last two verses of Surat al-Baqarah at night, they will be sufficient for him.'",
    sourceAr: "رواه الإمام البخاري في صحيحه (5009) عن أبي مسعود رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (مَنْ قَرَأَ بِالآيَتَيْنِ مِنْ آخِرِ سُورَةِ الْبَقَرَةِ فِي لَيْلَةٍ كَفَتَاهُ)",
    link: "https://sunnah.com/bukhari:5009",
  },
  {
    id: "tasbih-hundred-times",
    difficulty: ["medium", "hard"],
    actionPoint: "Say 'Subhanallah' 100 times.",
    actionPointAr: "قل: (سبحان الله) ١٠٠ مرة",
    benefit: "It is reported that one thousand good deeds are recorded or one thousand sins are removed.",
    benefitAr: "ورد أنه يكتب للمرء ألف حسنة أو يحط عنه ألف خطيئة",
    source: "Imam Muslim reports in his Sahih on the authority of Sa'd ibn Abi Waqqas that the Messenger of Allah ﷺ is reported to have said: 'Is any one of you unable to earn a thousand good deeds every day?... Glorify Allah a hundred times (by saying Subhanallah), and a thousand good deeds will be recorded for you or a thousand sins will be removed from you.'",
    sourceAr: "رواه الإمام مسلم في صحيحه (٢٦٩٨) عن سعد بن أبي وقاص رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (أَيَعْجِزُ أَحَدُكُمْ أَنْ يَكْسِبَ كُلَّ يَوْمٍ أَلْفَ حَسَنَةٍ... يُسَبِّحُ مِائَةَ تَسْبِيحَةٍ، فَيُكْتَبُ لَهُ أَلْفُ حَسَنَةٍ أَوْ يُحَطُّ عَنْهُ أَلْفُ خَطِيئَةٍ)",
    link: "https://sunnah.com/muslim:2698",
  },
  {
    id: "treasure-of-paradise",
    difficulty: ["medium", "hard"],
    actionPoint: "Say 'La hawla wala quwwata illa billah'.",
    actionPointAr: "قل: (لا حول ولا قوة إلا بالله)",
    benefit: "It is reported that this phrase is one of the treasures of Paradise.",
    benefitAr: "ورد أن هذه الكلمة كنز من كنوز الجنة",
    source: "Imam al-Bukhari reports in his Sahih on the authority of Abu Musa al-Ash'ari that the Messenger of Allah ﷺ is reported to have said: 'Shall I not guide you to a word which is one of the treasures of Paradise? It is: La hawla wala quwwata illa billah (There is no might nor power except with Allah).'",
    sourceAr: "رواه الإمام البخاري في صحيحه (٦٣٨٤) عن أبي موسى الأشعري رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (أَلَا أَدُلُّكَ عَلَى كَلِمَةٍ هِيَ كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ؟ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ)",
    link: "https://sunnah.com/bukhari:6384",
  },
  {
    id: "qiyam-imanan-wa-ihtisaban",
    difficulty: ["easy", "medium", "hard"],
    actionPoint: "Pray Taraweeh with sincere faith and hope for reward.",
    actionPointAr: "قيام ليالي العشر الأواخر من رمضان إيمانًا واحتسابًا",
    benefit: "It is reported that previous sins may be forgiven.",
    benefitAr: "ورد أنه يغفر للمرء ما تقدم من ذنبه",
    source: "Imam al-Bukhari reports in his Sahih on the authority of Abu Hurayrah that the Messenger of Allah ﷺ is reported to have said: 'Whoever stands in prayer during Ramadan out of faith and in hope of reward, his previous sins will be forgiven.'",
    sourceAr: "رواه الإمام البخاري في صحيحه (37) عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (مَنْ قَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ)",
    link: "https://sunnah.com/bukhari:37",
  },
  {
    id: "tahlil-hundred-times",
    difficulty: ["hard"],
    actionPoint: "Recite 'La ilaha illa Allah wahdahu la sharika lah, lahul-mulk wa lahul-hamd, wa huwa 'ala kulli shay'in qadir' 100 times.",
    actionPointAr: "قل: (لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير) ١٠٠ مرة",
    benefit: "It is reported that the reciter receives the reward of freeing ten slaves, has one hundred good deeds recorded, one hundred sins removed, and is protected from Shaytan.",
    benefitAr: "ورد أن قائلها له عدل عشر رقاب، وتكتب له مائة حسنة، وتمحى عنه مائة سيئة، وتكون له حرزًا من الشيطان",
    source: "Imam al-Bukhari reports in his Sahih on the authority of Abu Hurayrah that the Messenger of Allah ﷺ is reported to have said: 'Whoever says [this] one hundred times in a day will have a reward equivalent to that of freeing ten slaves, one hundred good deeds will be recorded to his credit, one hundred sins will be blotted out from his scroll, and it will be a protection for him from Satan on that day until evening.'",
    sourceAr: "رواه الإمام البخاري في صحيحه (٣٢٩٣) عن أبي هريرة رضي الله عنه أن رسول الله صلى الله عليه وسلم قال: (مَنْ قَالَ لا إِلَهَ إِلا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ فِي يَوْمٍ مِائَةَ مَرَّةٍ كَانَتْ لَهُ عَدْلَ عَشْرِ رِقَابٍ وَكُتِبَتْ لَه مِائَةُ حَسَنَةٍ وَمُحِيَتْ عَنْهُ مِائَةُ سَيِّئَةٍ، وَكَانَتْ لَهُ حِرْزًا مِنَ الشَّيْطَانِ يَوْمَهُ ذَلِكَ حَتَّى يُمْسِيَ)",
    link: "https://sunnah.com/bukhari:3293",
  },
];

export function getItemsByDifficulty(difficulty: Difficulty): LastTenChecklistItem[] {
  return LAST_TEN_ITEMS.filter((item) => item.difficulty.includes(difficulty));
}

/** Salawat cascade: 100 implies 20 and 5; 20 implies 5. Used for display and counts. */
export function isItemEffectivelyChecked(
  itemId: string,
  checkedItems: Record<string, boolean>,
): boolean {
  if (itemId === "blessings-on-prophet-5") {
    return Boolean(
      checkedItems["blessings-on-prophet-5"] ||
        checkedItems["blessings-on-prophet-20"] ||
        checkedItems["blessings-on-prophet-100"],
    );
  }
  if (itemId === "blessings-on-prophet-20") {
    return Boolean(
      checkedItems["blessings-on-prophet-20"] ||
        checkedItems["blessings-on-prophet-100"],
    );
  }
  return Boolean(checkedItems[itemId]);
}

export function createEmptyLastTenChecklistState(): LastTenChecklistState {
  return LAST_TEN_NIGHTS.reduce<LastTenChecklistState>((state, night) => {
    state[String(night)] = {};
    return state;
  }, {});
}
