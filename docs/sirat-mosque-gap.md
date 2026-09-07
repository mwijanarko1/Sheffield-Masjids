# Sirat.uk mosques we don't have (gap list)

Generated 2026-09-03 from `https://sirat.uk/mosques/v1/mosques?limit=1000`
(605 mosques, health status `degraded`, 103 stale sources at time of pull).

Our registry at time of pull: 212 GB mosques. Matched against Sirat: 74.  
**As of 2026-09-07:** 259 GB mosques in registry (+47 since pull; includes Sirat gap work and other additions).

**Gap list status (pruned 174 actionable rows from original 500):**

| Status | Count |
|--------|------:|
| Unprocessed (has website) | 141 |
| `[VISION-DEFERRED]` — PDF/image only | 33 |
| Removed — no website | 270 |
| Removed — already in registry / done | 44 |
| Removed — invalid website field | 3 |

Original pull had 227 gap mosques with websites; **174 remain** after dedup and no-website removal.

## Progress report (2026-09-07)

### Extraction this sprint (+9 `[DONE]` since count was 464)

| Mosque | Slug | City | Source | Coverage |
|--------|------|------|--------|----------|
| TCA & Kotku Mosque | `kotku-mosque` | Newcastle upon Tyne | my-masjid.com API | Full year, visible |
| Masjid Al-Aqsa | `masjid-al-aqsa-walsall` | Walsall | go2masjid API | Sep–Dec only, hidden |
| Five Bells (Newmarket) | `five-bells-newmarket-mosque` | Cambridge | DPT AJAX | Full year, visible |
| Scarborough Islamic Centre | `scarborough-islamic-centre` | Scarborough (GB) | masjidal.com API | Full year, visible |
| Muslim Welfare Chesterfield | `muslim-welfare-chesterfield` | Chesterfield | DPT AJAX | Full year, visible |

New fetch scripts: `scripts/fetch-go2masjid-timetable.mjs`, `scripts/fetch-masjidal-timetable.mjs`.

### GB city coverage goal (≥5 mosques per city)

**49 of 65 GB cities** still have fewer than 5 mosques. Sirat gap HTTP work **cannot** close most of these — remaining gap rows for under-5 cities are no-website, duplicate-registry, vision-deferred, or blocked.

**At 4/5 (need 1 each) — HTTP exhausted for gap list:**

| City | Count | Gap-list options |
|------|------:|------------------|
| Bristol | 4/5 | Only `[VISION-DEFERRED]` Easton Jamia; rest no website |
| Edinburgh | 4/5 | Bathgate, Polwarth — no website |
| Nottingham | 4/5 | Karimia ×2, Shah Poran — all `[VISION-DEFERRED]` |
| Rochdale | 4/5 | Central, Al Furqan, Neeli — no website |

**At 3/5 (need 2 each) — notable gap-list status:**

| City | Count | Notes |
|------|------:|-------|
| Walsall | 3/5 | Al-Aqsa added (partial); no further HTTP rows |
| West Bromwich | 3/5 | NIT Masjid — site returns 403 |
| Slough | 3/5 | Al-Hira, Montem Lane — `[VISION-DEFERRED]` only |
| Derby | 3/5 | Derby Jamia — `[VISION-DEFERRED]` (sheet/PDF) |

**New GB cities from gap work (1/5 each):** Chesterfield, Scarborough (GB).

### HTTP blocked / failed (logged 2026-09-07)

Do not retry without a new source or manual data:

| Mosque | Issue |
|--------|-------|
| Derby Jamia Mosque | Google Sheet missing adhan for most months; annual PDF → `[VISION-DEFERRED]` |
| Rugby Mosque (CV21) | DPT AJAX returns HTTP 400 |
| NIT Masjid (West Bromwich) | `nit.org.uk` returns 403 |
| Masjid-Ul-Aqsa / Bilal Jamia (Oldham) | DPT 429 / 404 (Oldham already at 5/5) |
| Wycombe Mosque / MECAWT | No extractable API on site; MECAWT salahtimes 406 |
| Aylesbury Vale Islamic Centre | Sky Prayer plugin uses MWL calculation — banned |
| Shahjalal Ipswich | Drupal daily nodes only (not full year) |
| Madina Jame Masjid Docklands | DPT returns placeholder 12:00 am times (stale 2023 data) |
| Gap duplicate rows (Luton/Cardiff/York) | `website` field is a mosque name, not a URL |

### Recommended next steps

1. **Vision-deferred batch** — prioritise 4/5 cities: Easton Jamia (Bristol), Karimia (Nottingham), etc.
2. **Manual lookup** — Rochdale, Edinburgh (no-website rows were removed from this file; find sources separately).
3. **HTTP extraction** — 150 unprocessed rows with websites remain (London E/CR and Birmingham B largest clusters).
4. **London / Birmingham** — largest remaining gap volume.

---

## Agent workflow (read this first if you were given this file to work through)

Work the list top to bottom in batches:

1. Pick the next row without `[VISION-DEFERRED]` (all rows now have a website). Prefer a city where we have low coverage. HTTP extraction comes strictly first (see step 3): never work a `[VISION-DEFERRED]` row while unprocessed rows remain.
2. Load the `extract-mosque-prayer-times` skill and follow it. Never import Sirat prayer times; re-verify all times from the mosque's own published source.
3. HTTP extraction only, strictly in this order: (a) exhaust every mosque extractable over plain HTTP: JSON/REST endpoints, CSV/Google Sheets, HTML tables, text PDFs (`pdftotext -layout`); (b) only when no HTTP-extractable rows remain, start working `[VISION-DEFERRED]` rows. If the only source is images or scanned PDFs needing a vision model, do NOT extract: mark the row `[VISION-DEFERRED]` and move on to the next HTTP-extractable row.
4. Write `public/data/mosques/gb/{citySlug}/{mosque-id}/{month}.json` files plus a `public/data/mosques.json` registry entry. Set `isHidden: true` when months are missing or the source only has partial data; `false` only for a verified full year.
5. Validate day counts, date ordering, and spot-check values against the source, then seed dev (`npm run seed:dev -- --changed`) and verify. Ask the user for explicit confirmation before seeding prod.
6. Mark the finished row complete, add it to the Done section below, and remove it from the gap tables.

## Done (extracted, seeded dev + prod)

- [DONE] Madina Masjid Darwen (BB3) - full year, visible
- [DONE] Lammack Prayer Room (BB2) - Jan-Oct, hidden until Nov-Dec publish
- [DONE] Jamiatul Ilm Wal Huda (BB1) - Sep only, hidden (site keeps current month only)
- [DONE] Masjid-E-Hamzah (OL7) - full year via DPT JSON API, visible
- [DONE] Crawley Mosque (RH11) - Jan-Sep via DPT HTML, hidden (Oct-Dec not yet on site)
- [DONE] St Albans Islamic Centre (AL1) - full year via DPT AJAX, verified vs published PDFs, visible
- [DONE] Birmingham Jame Masjid (B6) - September only via MasjidBox, hidden (site keeps current month only)
- [DONE] Birmingham Muslim Foundation (B9) - September only via HTML table, hidden (site keeps current month only)
- [DONE] Bournville Masjid & Community Centre (B30) - full year via Mawaqit widget, hidden (computed source)
- [DONE] Cradley Heath Central Mosque (B64) - full year via POST form HTML tables, visible
- [DONE] IQRA Masjid Coventry (CV5) - full year via DPT AJAX, visible
- [DONE] Al-Furqan Mosque Glasgow (G4) - full year via DPT AJAX, visible
- [DONE] Glasgow Mena Centre (G4) - full year via DPT AJAX, visible
- [DONE] Jamia Islamia Glasgow (G41) - full year via DPT AJAX (dual Asr), visible
- [DONE] Al Rahmah Community Centre Glasgow (G20) - full year via Mawaqit widget, hidden (computed source)
- [DONE] Beeston Muslim Centre Nottingham (NG9) - full year via DPT AJAX, visible
- [DONE] Madina Mosque Cardiff (CF24) - September only via MasjidBox REDUX_STATE, hidden (API limited to 7-day window)
- [DONE] Huda Masjid and Community Centre (B19) - full year via Mawaqit widget (huda-birmingham), hidden (computed source)
- [DONE] Halesowen/Dudley YCA (B63) - full year via Mawaqit (masjid-al-warith-halesowen), hidden (computed source)
- [DONE] Hazrat Sultan Bahu Trust (B12) - full year via DPT AJAX, visible
- [DONE] Lozells Central Mosque (B19) - full year via DPT AJAX, visible
- [DONE] Makki Masjid & Madrasa Birmingham (B21) - full year via DPT AJAX, visible
- [DONE] Manarat Foundation (B26) - Mar-Dec via HTML tables, hidden (Jan-Feb not published on site)
- [DONE] Masjid Abubakr Siddique (B66) - full year via DPT AJAX, visible
- [DONE] Masjid e Hamza Birmingham (B13) - full year via prayer-times.json, visible
- [DONE] Masjid Eesa ibn Maryam (B28) - full year via DPT AJAX (arrahma.co.uk), visible
- [DONE] Masjid Ul Madni (B6) - full year via DPT AJAX (madnimasjid.com), visible
- [DONE] Qadria Trust (B12) - full year via DPT AJAX (qadriatrust.com), visible
- [DONE] Yemeni Community Association in Sandwell (B70) - full year via DPT AJAX (yca-sandwell.org.uk), visible
- [DONE] Al-Medinah Mosque Brighton (BN1) - full year via Laravel API (almedinah.co.uk), visible
- [DONE] BD5 Masjid (BD5) - September only via Amanahfy Next.js (bd5masjid.com), hidden
- [DONE] Al-Jamia Suffa-Tul-Islam Grand Mosque (BD5) - already as `bradford-grand-mosque`, full year via PDF vision, visible
- [DONE] Jamiyat Tablighul Islam Coventry Street (BD4) - already as `central-mosque-bradford`, full year via DPT AJAX (jamiyat.org), visible
- [DONE] TCA & Kotku Mosque (NE4) - full year via my-masjid.com API (mecfoundation.org.uk), visible
- [DONE] Masjid Al-Aqsa (WS2) - Sep-Dec via go2masjid API (masjid-alaqsa-walsall.co.uk), hidden (rolling 365-day window; Jan-Aug 2026 not available)
- [DONE] Five Bells - Modern Islamic Centre (CB8) - full year via DPT AJAX (newmarketmosque.com), visible
- [DONE] Scarborough Islamic Centre (YO12) - full year via masjidal.com API (scarbislam.com), visible
- [DONE] Muslim Welfare Association of Chesterfield (S40) - full year via DPT AJAX (muslimwelfarechesterfield.com), visible

- [DONE] Falkirk Islamic Centre (FK1) - full year via DPT AJAX (falkirkislamiccentre.org), visible
- [DONE] Lancaster Islamic Society (LA1) - full year via DPT AJAX (lancasterisoc.org), visible
- [DONE] Maldon District Islamic Cultural Association (CM9) - full year via DPT AJAX (maldonmosque.org.uk), visible
- [DONE] Forest Gate Central Masjid (E7) - full year via DPT AJAX (forestgatecentralmasjid.org), visible
- [DONE] Bishops Way Mosque (E2) - full year via DPT AJAX (bishopswaymosque.co.uk), visible

- [DONE] Darul Arqam Educational Trust (LE5) - full year via DPT AJAX (datrust.org), visible

- [DONE] Madrasah Baytul Ilm / Masjid Ibrahim (LE5) - full year via DPT AJAX (baytulilm.org), visible

- [DONE] Turners Road Masjid (E3) - full year via DPT AJAX (turnersroadmasjid.org), visible

## Done (added outside Sirat gap list)

- [DONE] Darul Elm Masjid and Community Centre (B19) - Jun+Sep 2026 via vision PDF/image (darul-elm.org), hidden (partial year; homepage image is current month)

Rows below marked `[DONE]` are complete. **Actionable gap rows remaining: 141** (+ 33 vision-deferred).

## How to use this file

- Do NOT import their prayer times. Per project decision, times are re-checked
  from each mosque's own website/source before any data is added.
- Website URLs come from the Sirat directory listing (`website_url`). Rows without a valid website URL have been removed from the gap tables (see **Removed entries**).
- Matching was name + postcode anchored (same full postcode, or same outward code
  with similar name). Generic names in different towns (e.g. two `Masjid Bilal`s)
  are correctly listed as separate mosques.
- Some entries may already appear in `uk-mosque-expansion-shortlist.md`; marked with *.

## Removed entries (2026-09-07 cleanup)

Pruned the gap list to **actionable rows only** (valid `http(s)` website, not already in registry, not `[DONE]`).

| Reason | Count |
|--------|------:|
| No website listed | 270 |
| Invalid website field (not a URL) | 3 |
| Already extracted (`[DONE]`) | 43 |
| Duplicate of existing registry mosque | 1 |
| **Remaining in gap tables** | **174** (33 `[VISION-DEFERRED]`, 141 unprocessed) |

The former **Possible duplicates** table (31 rows) was reviewed: those Sirat entries either were never in the gap list or were removed by the rules above. Name-only fuzzy matches across different towns (e.g. Sleaford vs Ilford) were not treated as duplicates.


## Gap mosques by postcode area

### AL (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] London Colney Islamic Centre * | 174-174A High Street, Hertfordshire, London Colney, AL2 1JY | https://www.lcic.org.uk/ | mosque-000532 |

### B (10)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Adam Mosque & Dawah Academy * | 19-31 Brunswick Road, Sparkbrook, Birmingham, B12 8NP | https://dawahacademy.uk/contact-us | mosque-000611 |
| [VISION-DEFERRED] As-Suffa | 156 High Street, Birmingham, B6 4UX | https://as-suffa.org/ | mosque-000368 |
| [VISION-DEFERRED] Great Barr Muslim Foundation * | 394 Walsall Road, Birmingham, B42 2LX | https://gbmf.uk/ | mosque-000501 |
| Jamiat-us-Salam | 818 Alum Rock Road, Ward End, Birmingham, B8 2TX | https://www.jamiasalam.com/ | mosque-000295 |
| [VISION-DEFERRED] Masjid Baitul Amaan * | 253 Halfords Lane, Smethwick, B66 1BD | https://masjidbaitulamaan.org.uk/about/ | mosque-000079 |
| Masjid Imam Al-Shafi'i & Community Centre * | 238 Anthony Road, Alum Rock, Birmingham, B8 3AN | https://www.masjidimamshafii.com/ | mosque-000206 |
| [VISION-DEFERRED] Masjid Qamarul Islam * | 168-170 Fosbrooke Road, Birmingham, B10 9JP | https://masjidqamarulislam.co.uk/ | mosque-000140 |
| [VISION-DEFERRED] Paigham-E-Islam Trust Britain * | 423 Stratford Road, Sparkhill, Birmingham, B11 4LB | https://www.paigham-e-islam.co.uk/contact-us/ | mosque-000594 |
| Soho Hill Muslim School * | 130 Soho Hill, West Midlands, Birmingham, B19 1AF | http://www.sohohillmuslim.org.uk/contact | mosque-000237 |
| Zumunta Community * | Unit 39, Newtown Shopping Centre, Birmingham, B19 2SS | https://zumuntacommunity.org/ | mosque-000321 |

### BA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Trowbridge Mosque * | 54 Longfield Road, Trowbridge, BA14 7AD | https://www.trowbridgemasjid.org/ | mosque-000366 |

### BB (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Daneshouse Masjid * | 53 Daneshouse Road, Burnley, BB10 1AF | https://www.diec.org.uk/ | mosque-000543 |
| [VISION-DEFERRED] Jame Masjid-e-Noor * | 71 Saunders Road, Lancashire, Blackburn, BB2 6LS | https://masjidenoor.org/ | mosque-000120 |
| [VISION-DEFERRED] Taleem Ul Islam * | 1-15, Whalley Old Road, Cob Wall, Blackburn, BB1 5JJ | https://taleemulislam.org.uk/ | mosque-000293 |
| [VISION-DEFERRED] UKIM Ibrahim Masjid * | 2 Clegg Street, Lancashire, Burnley, BB10 1AX | https://ibrahimmasjid.co.uk/contact-us/ | mosque-000112 |

### BD (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Jamia Masjid Shan-e-Islam * | 80 Beamsley Rd, Frizinghall, Shipley, BD18 2DR | https://www.shaneislam.co.uk | mosque-000176 |
| Madressa Khaliliya & Education Centre (Masjid-e-Usman) * | 57 Upper Seymour Street, Bradford, BD3 9LJ | https://www.bsmks.org.uk | mosque-000172 |

### BL (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Azhar Academy Bolton * | Devonshire Education Centre, 20 Devonshire Road, Lancashire, Heaton, Bolton, BL1 4PG | https://www.azharacademybolton.org/about-us | mosque-000469 |
| Hulton Lane Centre for Education * | Linnyshaw Close, Bolton, BL3 4WL | https://tafseer-raheemi.com/introduction-raheemi-academy-hulton-lane-centre-hlc-bolton-27119/ | mosque-000336 |
| [VISION-DEFERRED] Jamia Khizra Mosque and Islamic Centre, Bury * | 21-25 Parker Street, Bury, BL9 0RJ | https://www.khizramosquebury.com/ | mosque-000408 |
| [VISION-DEFERRED] Khizra Mosque - Walmersley Road * | 85 Walmersley Road, Bury, BL9 5AN | https://www.khizramosquebury.com/ | mosque-000146 |
| [VISION-DEFERRED] MA Mission UK * | 365 Halliwell Road, Bolton, BL1 8DE | https://mamissionuk.com/ | mosque-000220 |

### BR (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Bromley Islamic Centre * | High Street, Bromley, BR1 1EY | https://www.bromleyislamiccentre.org.uk/ | mosque-000296 |
| Taqwaa Social & Cultural Society - Friday Prayers * | St Francis of Assisi Church Hall, Greencourt Road, Orpington, Petts Wood, London, BR5 1QW | https://www.tscs.org.uk/friday/ | mosque-000104 |

### BS (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Easton Jamia Masjid * | St Marks Road, Easton, Bristol, BS5 6JH | https://eastonjamiamasjid.co.uk/about-us/ | mosque-000508 |

### CB (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Cambourne Jumu’ah Salaah | Cambourne Community Hub, High Street, Cambridge, Cambourne, CB23 6GW | https://www.cambournecrescent.org/ | mosque-000242 |

### CR (6)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Khair Foundation Prayer Room and Hall * | 109-119 Cherry Orchard Road, Croydon, CR0 6BE | https://www.alkhair.org/ | mosque-000038 |
| Al-Madina Mitcham Islamic Centre * | 201A Streatham Road, Mitcham, London, CR4 2AJ | https://almadina.cfsites.org/custom.php?pageid=28993 | mosque-000044 |
| Alhidaya Croydon Masjid * | 177 Brigstock Road, London, CR7 7JP | https://alhidayacroydon.org/ | mosque-000247 |
| Croydon Mosque & Islamic Centre * | 525 London Road, Surrey, Thornton Heath, London, CR7 6AR | https://www.croydonmosque.com/ | mosque-000057 |
| Makkah Masjid Mitcham * | 226 London Road, Mitcham, London, CR4 3HD | https://www.makkah-masjid-mitcham.org/ | mosque-000019 |
| Makkah Masjid Mitcham * | 226 London Rd, Mitcham, London, CR4 3HD | https://www.makkah-masjid-mitcham.org/ | mosque-000584 |

### CV (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Faizan-e-Islam * | 202 Lockhurst Lane, Foleshill, Coventry, CV6 5NJ | https://dawateislamimidlands.net/prayer-time-table/ | mosque-000023 |
| Rugby Mosque * | Grosvenor Road, Rugby, CV21 3LE | https://rugby-mosque.org/contact-us/ | mosque-000410 |
| [VISION-DEFERRED] Umar Education and Welfare Centre * | 137 Avon Street, Coventry, CV2 3GQ | https://uewt.co.uk/ | mosque-000383 |

### DA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Gravesend Central Mosque * | Albion Terrace, Kent, Gravesend, DA12 2SX | https://gravesendcentralmosque.com/ | mosque-000540 |

### DE (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Derby Jamia Mosque * | 6 Rose Hill Street, Derby, DE23 8GA | https://derbyjamiamosque.co.uk/ | mosque-000475 |

### DN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Grimsby Islamic Cultural Centre * | 79A Weelsby Road, Grimsby, DN32 0PY | http://www.gicconline.com/ | mosque-000136 |

### DY (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| NIT Masjid * | 61 Cinder Bank, Netherton, Dudley, DY2 9BH | https://nit.org.uk/ | mosque-000184 |

### E (25)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Albirr Foundation | 106 Church Road, London, Leyton, E10 5HG | https://www.albirr.com/ | mosque-000250 |
| Ashaadibi Masjid & Community Hub * | 167 Cannon Street Road, London, E1 2LX | https://ashaadibi.co.uk/contact/ | mosque-000575 |
| Baitur Rahman Masjid * | 440 High Street North, Manor Park, London, E12 6RH | https://www.baiturrahmanmasjid.co.uk/ | mosque-000272 |
| Bow Muslim Community Centre * | 515B-517 Roman Road, London, E3 5EL | https://www.bowmosque.co.uk/ | mosque-000076 |
| Chingford Islamic Society * | 90-92 Chingford Mount Road, London, Chingford, E4 9AA | http://www.chingfordmasjid.com/ | mosque-000617 |
| Green Street Masjid * | 88 Green Street, London, E7 8JG | https://greenstreetmasjid.org/contact-us/ | mosque-000157 |
| Hackney Central Masjid * | 237 Well Street, London, Hackney, E9 6RG | https://www.hackneyjamah.com/jummah | mosque-000198 |
| Hamlets Way Masjid * | 97-103 Hamlets Way, London, E3 4TL | https://hamletswaymosque.com/ | mosque-000330 |
| Islamic Dawah Centre * | 398 High Street North, London, E12 6RH | https://idcuk.org/demo/contact/ | mosque-000607 |
| Lansbury Estate Masjid * | 20 Alton Street, London, E14 6BZ | https://www.lansburymasjid.co.uk | mosque-000036 |
| Leytonstone Islamic Association * | Dacre Road, Leytonstone, London, E11 3AG | https://www.lia-trust.org/ | mosque-000155 |
| Limehouse Masjid * | 304-306 Stocks Place, London, E14 8AE | https://www.limehousemasjid.org.uk | mosque-000083 |
| Madina Jame Masjid Docklands * | 248 Westferry Road, London, E14 3AG | https://madinamasjiddocklands.org.uk/ | mosque-000154 |
| Masjid Abdul-Aziz Bin Bāz * | East Road, London, West Ham, E15 3QR | https://masjidbinbaz.com/ | mosque-000072 |
| Masjid Al-Fath / Hifzul Quran Islamic Education Centre * | 304-306 Burdett Road, London, E14 7DQ | https://hqiec.co.uk/ | mosque-000277 |
| Masjid Darul Ilm * | 16-18 Pilgrims Way, London, East Ham, E6 1HW | https://slmcel.org.uk/ | mosque-000350 |
| Masjid Ul Hidayah * | 2A Church Road, Manor Park, London, E12 6AQ | https://www.masjidulhidayah.co.uk/ | mosque-000248 |
| Poplar Central Mosque * | 253 East India Dock Road, Poplar, London, E14 0EG | https://www.poplarmosque.co.uk/ | mosque-000417 |
| Quwwat-ul-Islam Society * | 62-66 Upton Lane, Forest Gate, London, E7 9LN | https://quwwatulislam.org/ | mosque-000570 |
| Shadwell Jame Masjid * | 143-145 Martha Street, London, E1 2QB | https://shadwelljamemasjid.org.uk/ | mosque-000494 |
| Stratford Islamic Association * | 3-5 Brydges Road, Stratford, London, E15 1NA | https://www.stratfordislamicassociation.com | mosque-000197 |
| The Markazi Masjid London * | 9-11 Christian Street, London, E1 1SE | https://www.markazimasjid.org/ | mosque-000011 |
| The Shade | Unit 1 Church Road Studios, 62 Church Road, Manor Park, London, E12 6AF | https://theshade.org/contact/ | mosque-000343 |
| UKIM Masjid Ibrahim & Islamic Centre * | 721-723 Barking Road, London, E13 9EU | https://www.masjidibrahim.co.uk/ | mosque-000459 |
| Weaversfield Muslim Prayer Hall * | 3A Railway Arch, Brady Street, London, E1 5DT | https://weaversfield-muslim-prayer-hall.ueniweb.com/ | mosque-000437 |

### EC (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Halls4Jumu’ah - Golden Lane | Golden Lane Sport & Fitness, Fann Street, London, EC1Y 0SH | https://www.halls4jumuah.org/zuhr-prayer-times | mosque-000363 |
| Holborn Mosque * | 33 Brookes Court, Baldwins Gardens, London, EC1N 7RR | https://www.holbornmosque.org/contact-us | mosque-000328 |

### G (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Islamic Education Trust Cumbernauld * | 5 Craighalbert Way, Lanarkshire, Cumbernauld, G68 0LS | https://islamictrust.org/contact-us/ | mosque-000411 |

### GU (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Shah Jahan Mosque * | 149 Oriental Road, Surrey, Woking, GU22 7BA | https://shahjahanmosque.org.uk/home/contact/ | mosque-000167 |

### HA (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Islamic Centre Edgware * | 9D Deansbrook Road, Edgware, London, HA8 9BE | https://islamiccentreedgware.org/ | mosque-000290 |
| Taiba Welfare Foundation * | Pride House, Rectory Lane, Edgware, HA8 7LG | https://taibafoundation.org/ | mosque-000529 |

### HP (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Aylesbury Vale Islamic Centre * | Unit 10, Chamberlain Road, Aylesbury, HP19 8DY | https://aylesburyislamiccentre.com/ | mosque-000471 |
| Baytus Salaam * | Stevenage Rise, Hemel Hempstead, HP2 6BH | https://www.dbwa.org.uk/contact/ | mosque-000439 |
| Muslim Education Centre and Welfare Trust * | 3-4 The Parade, Totteridge Drive, High Wycombe, HP13 6UH | https://www.mecawt.co.uk/yourcentre/salahtimes/ | mosque-000571 |
| Wycombe Mosque * | 34 Jubilee Road, High Wycombe, HP11 2PG | https://www.wycombemosque.com/about-us | mosque-000505 |

### IG (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Eman Foundation | 2A Ashgrove Road, Ilford, London, IG3 9XE | https://emanfoundation.co.uk/contact | mosque-000200 |
| Hedgecock Community Centre * | 28 Stephen Jewers Gardens, Barking, IG11 9FA | https://hedgecockcentre.org.uk/contact/ | mosque-000219 |
| Jabir Bin Zayd Islamic Centre * | 11-13 Broadway, East London, Barking, IG11 7LS | https://ahlulistiqamah.co.uk/index.php/en/about | mosque-000168 |
| Thames View Muslim Association * | 15B Farr Avenue, Barking, IG11 0NZ | https://www.tvmacharity.org.uk/Contact.html | mosque-000077 |

### IP (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Shahjalal Islamic Centre & Masjid * | 15 Argyle Street, Suffolk, Ipswich, IP4 2NE | https://shahjalalmasjidipswich.co.uk/contact-us | mosque-000486 |

### KT (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| New Malden Jummah | SMT Manor Park Hall, Malden Road, New Malden, London, KT3 6AU | https://www.newmaldenjummah.co.uk/ | mosque-000323 |

### KY (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Fife Islamic Centre - Noor-e-Madina Mosque * | 786 Poplar Road, Glenrothes, KY7 4AA | https://www.fifeislamiccentre.co.uk/ | mosque-000017 |
| Fife Muslim Educational & Cultural Centre - Cadham * | Huntsman House, 33 Cadham Centre, Glenrothes, KY7 6RU | https://fife.go2masjid.website | mosque-000564 |

### L (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Liverpool Muslim Society / Al Rahma Mosque * | 29-31 Hatherley Street, Liverpool, L8 2TJ | http://www.liverpoolmuslimsociety.org.uk/ | mosque-000002 |

### LE (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Madani Masjid * | 77 Evington Valley Road, Evington, Leicester, LE5 5LL | https://madani.school/community | mosque-000228 |
| Madrasah Abu Hurairah * | 9 Haynes Road, Leicester, LE5 4AR | https://madrasahabuhurairah.co.uk/ | mosque-000371 |
| Tajdaar-e-Madina * | 1A Garendon Street, Leicester, LE2 0AH | https://temadina.co.uk/ | mosque-000240 |
| The Islamic Foundation * | Ratby Lane, Leicestershire, Markfield, LE67 9SY | https://www.islamic-foundation.org.uk/ | mosque-000153 |
| The Leicester Central Mosque * | Conduit Street, Leicester, LE2 0JN | https://www.islamiccentre.org/contact-us-topmenu-18/1-the-leicester-central-mosque | mosque-000162 |

### LN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Lincoln Central Mosque * | Dixon Street, Lincoln, LN6 7DA | https://lincolncentralmosque.org.uk/ | mosque-000414 |

### LS (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Iqra Centre * | 4-6 Carr Manor Crescent, Moortown, Leeds, LS17 5DH | https://www.iqracentre.org.uk/ | mosque-000303 |
| Leeds Islamic Centre * | 48 Spencer Place, Leeds, LS7 4BR | https://www.leedsic.com/contact.php | mosque-000614 |
| Masjid e Quba Leeds * | 24 Shepherds Lane, Leeds, LS8 4LG | http://www.alhassan.org.uk/ | mosque-000597 |

### LU (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Central Mosque Luton * | 2-12 Westbourne Road, Luton, LU4 8JD | https://lutoncentralmosque.org/ | mosque-000059 |

### M (6)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Raza Foundation | 8-16 Park Grove, Manchester, M19 3AQ | https://alrazafoundation.org.uk/ | mosque-000434 |
| Markaz Darulehsan Manchester | 21-23 Broughton Street, Cheetham Hill, Manchester, M8 8LZ | https://darulehsanuk.co.uk/contact-us/ | mosque-000081 |
| NASFAT Manchester Central * | 227 Droylsden Road, Manchester, M40 1NY | http://nasfatmanchester.org.uk/ | mosque-000555 |
| Salaam Community Association and Masjid * | 42 Raby Street, Moss Side, Manchester, M16 7DJ | https://salaamca.org/ | mosque-000118 |
| UKIM Khizra Mosque * | 425 Cheetham Hill Road, Manchester, M8 0PF | https://www.khizramosque.org/contact-us/ | mosque-000114 |
| University of Manchester Islamic Society - Sackville Prayer Hall * | Sackville Street Building, Basement, Manchester, M1 3BU | https://www.manchesterisoc.com/ | mosque-000380 |

### ME (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Chatham Hill Mosque & Kent Islamic Centre * | 22A Chatham Hill, Kent, Chatham, ME5 7AA | https://chathamhillmosque.co.uk/contact/ | mosque-000262 |
| Kent Muslim Welfare Association * | 114 Canterbury Street, Kent, Gillingham, ME7 5UH | https://kmwa.org.uk/about-us/ | mosque-000003 |

### MK (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Cranfield University Mosque * | Building 33, Cranfield University, College Road, Bedfordshire, Cranfield, Wharley End, MK43 0AL | https://www.cranfield.ac.uk/study/life-on-campus/worship | mosque-000111 |

### N (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Nehar Mosque & Education Centre * | 70 Caledonian Road, Islington, London, N1 9DN | https://alneharmosque.com/ | mosque-000326 |
| Al-Risaalah Mosque & Islington Islamic Centre * | 91-93 Parkhurst Road, London, N7 0LP | https://www.islingtonjamah.co.uk/al-risaalah | mosque-000070 |
| Aziziye Mosque * | 117-119 Stoke Newington Road, London, N16 8BU | https://www.aziziye.org.uk/ | mosque-000181 |
| Masjid Yusuf * | 440 Hornsey Road, London, N19 4EB | https://www.islingtonjamah.co.uk/masjidyusuf | mosque-000135 |

### NE (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Newcastle Central Mosque / Masjid Al-Tawhid * | The White House, Grainger Park Road, Newcastle upon Tyne, NE4 8RQ | https://www.newcastlecentralmosque.com/ | mosque-000379 |

### NG (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Karimia Institute * | 512-514 Berridge Road West, Bobbersmill, Nottingham, NG7 5JU | https://www.karimia.com/ | mosque-000030 |
| [VISION-DEFERRED] Karimia Masjid & Institute * | 141-143 Berridge Road, Forest Fields, Nottingham, NG7 6HR | https://www.karimia.com/ | mosque-000049 |
| [VISION-DEFERRED] Shah Poran Islamic Centre * | 2-4 Gregory Boulevard, Hyson Green, Nottingham, NG7 6BG | https://www.baituljabbarmosque.org.uk/ | mosque-000007 |

### NN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Baitul Ma’mur Jami' Masjid & Bangladeshi Islamic Centre * | 43 Argyle Street, Northampton, NN5 5LJ | https://bmjm.co.uk/ | mosque-000043 |

### NP (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Noor Masjid * | 23A Harrow Road, Casnewydd, NP19 0BU | https://www.alnoorandjamiamosque.co.uk/about-us | mosque-000436 |
| IQRA Community Centre * | 276 Corporation Road, Casnewydd, NP19 0DZ | https://iqranewport.co.uk | mosque-000441 |
| Jamia Masjid * | 183-186 Commercial Road, Casnewydd, NP20 2PP | https://www.alnoorandjamiamosque.co.uk/about-us | mosque-000572 |

### NR (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Hethersett Masjid * | Henstead Road, Norwich, Hethersett, NR9 3JH | https://hethersettmasjid.org.uk/contact/ | mosque-000582 |

### NW (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Afghan Islamic Cultural Centre * | 210-214 Church Road, London, NW10 9NP | http://www.afghanicc.com/about.html | mosque-000137 |
| Harlesden Ummah | 21 Craven Park Road, London, NW10 8SE | https://harlesdenummah.org/ | mosque-000113 |

### OL (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Azmet E Islam * | 79-85 Retford Street, Oldham, OL4 1BL | https://masjidbox.com/prayer-times/noor-e-islam-masjid | mosque-000352 |
| Bilal Jamia Masjid and Madressa * | 19-23 Ronald Street, Clarkfield, Lancashire, Oldham, OL4 1NE | https://bilaljamiamasjid.com/ | mosque-000578 |
| Masjid-Ul-Aqsa * | 135 Windsor Road, Oldham, OL8 1RG | https://www.masjidulaqsa.org.uk/ | mosque-000458 |
| Noor E Islam * | 44-46 Manchester Road, Oldham, OL9 7AP | https://www.ukimoldham.org.uk/ | mosque-000609 |

### OX (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Abingdon Muslims * | Radley Village Hall, Gooseacre, Radley, OX14 3BL | https://www.abingdonmuslims.org/ | mosque-000591 |
| Muslim Educational Centre of Oxford - Jumu’ah * | Second Floor, Chester House, 21-27 George Street, Oxford, OX1 2AY | http://www.meco.org.uk | mosque-000142 |
| SOMA Didcot - Jumu’ah | Fleet Meadow Community Hall, Sandringham Road, Didcot, OX11 8TP | https://somadidcot.org/ | mosque-000126 |

### PE (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Masjid Darassalaam (Alma Road) * | 80-82 Alma Road, Peterborough, PE1 3JB | https://www.darassalaam.org.uk | mosque-000192 |

### PL (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Plymouth Islamic Education Trust (PIETY) * | 19 Greenbank Avenue, Plymouth, PL4 8PS | http://piety.org.uk/visiting/ | mosque-000226 |

### PO (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Portsmouth Central Masjid * | 300 Somers Road North, Fratton, Portsmouth, PO1 1PL | http://portsmouthcentralmasjid.com/ | mosque-000033 |

### PR (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Masjid-e-Saliheen * | Grafton Street, Preston, PR1 8JH | https://masjidsaliheen.com/about-us/history | mosque-000476 |
| [VISION-DEFERRED] UCLan Islamic Society - Friday Prayers * | Sir Tom Finney Sports Centre, Marsh Lane, Lancashire, Preston, PR1 2HE | https://www.uclansu.co.uk/groups/islamic-society/ | mosque-000165 |

### RG (6)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Bracknell Masjid * | Unit C, Waterside Park, Bracknell, RG12 1RB | https://www.bracknell-ics.org.uk/contact/ | mosque-000489 |
| Central Jamme Masjid, Reading * | 18A Waylen Street, Berkshire, Reading, RG1 7UR | https://www.readingmosque.com/about/ | mosque-000442 |
| Masjid Albirr * | 35-37 Sarum Hill, Basingstoke, RG21 8SS | https://www.albirr.com/ | mosque-000275 |
| Newbury Jamme Masjid * | 33 Pound Street, Newbury, RG14 6AE | https://www.newburyjammemasjid.org.uk/about/ | mosque-000058 |
| Reading Islamic Centre - South Street Centre * | 50-52 South Street, Reading, RG1 4RA | https://www.ricuk.org | mosque-000533 |
| Whitley Muslim Education Trust - Friday Prayer Centre * | Scout Hut, 500 Basingstoke Road, Reading, RG2 0QN | https://wmet.co.uk/ | mosque-000128 |

### RH (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Masjid Al Yaqeen * | 28 Warwick Road, Surrey, Redhill, RH1 1BU | https://masjidalyaqeen.co.uk/ | mosque-000012 |

### RM (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Essex Cultural & Youth Society - Jumu’ah Salaah * | MYPLACE Building, Dagnam Park Drive, Romford, London, RM3 9EN | https://www.ecys.org.uk/jummah-salah/ | mosque-000320 |

### S (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Gulzar-e-Habib Mosque & Education Centre * | 46-48 Ribston Road, Darnall, Sheffield, S9 3AY | http://www.janathimessage.co.uk/contact.html | mosque-000090 |

### SA (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Sketty Mosque and Community Centre * | Sketty Park Road, Sketty, Abertawe, SA2 9AS | https://www.skettymosque.org/ | mosque-000110 |
| Swansea Mosque * | 159A St Helens Road, Abertawe, SA1 4DG | https://www.swanseamosque.org/contact | mosque-000145 |

### SE (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| BWA Muslim Cultural Centre and Mosque * | 10A Clifton Rise, New Cross, London, SE14 6JP | https://bwamcc.co.uk | mosque-000586 |
| Camberwell Islamic Centre * | 188 Camberwell Road, London, Camberwell, SE5 0ED | https://camberwellislamiccentre.co.uk/contact/ | mosque-000209 |
| Old Kent Road Mosque & Islamic Cultural Centre * | 365 Old Kent Road, London, SE1 5JH | https://www.manuk.org/ | mosque-000022 |
| SRICC Baitul Rahman Masjid * | Unit 1, 82-96 Old Kent Road, London, SE1 4NX | https://somalirelief.org.uk/ | mosque-000448 |
| The Prayer Space * | 2nd Floor, Aperture Building, 42 Chandlers Avenue, Greenwich Peninsula, London, SE10 0GE | http://www.prayerspace.org.uk | mosque-000600 |

### SG (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Stevenage Muslim Community Centre * | The Sishes, Vardon Road, Stevenage, SG1 5PZ | https://www.smcc786.org | mosque-000159 |

### SL (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Al-Hira Educational & Cultural Centre * | 68-72 Ragstone Road, Slough, SL1 2PX | https://alhiraslough.co.uk/contact/ | mosque-000491 |
| Al-Tawheed Masjid (TIECM) * | 22 Cookham Road, Maidenhead, SL6 8AJ | https://tiecm.org/ | mosque-000152 |
| [VISION-DEFERRED] Montem Lane Mosque * | 35 Montem Lane, Berkshire, Slough, SL1 2QW | https://www.sloughislamictrust.org.uk/Contact/ | mosque-000382 |

### SM (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Morden Islamic Community Centre * | 116 London Road, Surrey, Morden, SM4 5AX | https://www.miconline.co.uk/contact-us | mosque-000039 |

### SN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Swindon Jami’ah Masjid * | 124-125 Broad Street, Wiltshire, Swindon, SN1 2DR | https://www.swindonmasjid.com/ | mosque-000616 |

### SO (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Al-Hayat Centre * | Duke Road, Southampton, SO14 0SQ | https://alhayatcentre.co.uk/contact/ | mosque-000388 |

### ST (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Makki Masjid * | 59-61 Beresford Street, Stoke-on-Trent, ST4 2EX | https://makkimasjidstoke.co.uk/ | mosque-000496 |
| [VISION-DEFERRED] Markaz Al-Huda | Former Queensbury Youth Centre, Furnace Road, Normacot, Stoke-on-Trent, ST3 1QZ | https://attawheedfoundation.co.uk/ | mosque-000124 |
| [VISION-DEFERRED] Markaz As-Sunnah * | Ladywell Road, Tunstall, Stoke-on-Trent, ST6 5DE | https://attawheedfoundation.co.uk/markaz-as-sunnah/ | mosque-000355 |
| [VISION-DEFERRED] Markaz At-Tawheed | Rectory Road, Shelton, Stoke-on-Trent, ST1 4PW | https://attawheedfoundation.co.uk/contact-us/ | mosque-000313 |

### SW (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Muzzammil Mosque * | 8 Gatton Road, Tooting, London, SW17 0EX | http://gattonmosque.co.uk/ | mosque-000205 |
| Balham Masjid & Tooting Islamic Centre * | 47A Balham High Road, London, SW12 9AW | https://www.balhammosque.org/ | mosque-000087 |
| Bismillah Centre * | 1370C London Road, Norbury, London, SW16 4DE | https://bismillahcentre.com/?section=about | mosque-000418 |
| Norbury Islamic Academy * | 1595-1597 London Road, Norbury, London, SW16 4AA | https://www.norbury.org/?section=contactus | mosque-000378 |

### TN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Ashford Muslim Association * | 79 Torrington Road, Ashford, TN23 7TG | https://ashfordmosque.org/ | mosque-000401 |

### TW (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Ashford & Staines Community Centre * | 774 London Road, Stanwell, Ashford, London, TW14 8FP | https://ascc.uk.com/contact-us/ | mosque-000105 |
| Feltham Hira Centre * | 102 Hounslow Road, Feltham, TW14 0AX | https://www.hira.org.uk/ | mosque-000590 |

### W (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| An Noor Cultural & Community Centre * | 58-70 Church Road, London, Acton, W3 8PP | https://www.annoorcentre.com | mosque-000539 |
| Hammersmith Islamic Association * | 30-32 Bradmore Park Road, London, Hammersmith, W6 0DT | https://hammersmithmasjid.org/ | mosque-000563 |
| Muslim World League London Office * | 46 Goodge Street, London, W1T 4LU | https://www.mwllo.org.uk/ | mosque-000384 |
| Shepherds Bush Mosque * | 300-302 Uxbridge Road, Shepherds Bush, London, W12 7LJ | https://www.shepherdsbushmosque.org/ | mosque-000610 |

### WC (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| King's Cross Mosque & Islamic Cultural Centre * | Sandfield Basement, Cromer Street, London, WC1H 8DU | https://www.kingscrossmosque.org/contact | mosque-000270 |

### WD (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Elstree & Borehamwood Islamic Community * | Maxwell Park, Maxwell Road, Borehamwood, WD6 1JJ | https://ebic.org.uk/contact-us/ | mosque-000263 |

### WF (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Jamia Masjid Swafia * | Park Hill Lane, Wakefield, WF1 4NJ | https://www.swafia.org.uk/ | mosque-000428 |
| Masjid Noor & Education Centre * | Lees Hall Road, Dewsbury, WF12 9HF | http://www.masjid-noor.org/ | mosque-000253 |
| Masjid Zakariya * | 167 Agbrigg Road, Wakefield, WF1 5BN | https://masjidzakariya.co.uk/contact/ | mosque-000528 |

### WR (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Madina Jami Masjid Worcester * | Tolladine Road, Worcester, WR4 9PS | https://almadinamasjid.uk/ | mosque-000082 |
