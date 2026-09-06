# Sirat.uk mosques we don't have (gap list)

Generated 2026-09-03 from `https://sirat.uk/mosques/v1/mosques?limit=1000`
(605 mosques, health status `degraded`, 103 stale sources at time of pull).

Our registry at time of pull: 212 GB mosques. Matched against Sirat: 74. 
**Gap: 500 mosques below** (+ 31 possible duplicates awaiting manual check).
Websites present for 227 of 500 gap mosques; the rest show `no website listed`.

## Agent workflow (read this first if you were given this file to work through)

Work the list top to bottom in batches:

1. Pick the next row without `[DONE]` or `[VISION-DEFERRED]`. Prefer a mosque with a website, in a city where we have low coverage. HTTP extraction comes strictly first (see step 3): never work a `[VISION-DEFERRED]` row while unprocessed website rows remain.
2. Load the `extract-mosque-prayer-times` skill and follow it. Never import Sirat prayer times; re-verify all times from the mosque's own published source.
3. HTTP extraction only, strictly in this order: (a) exhaust every mosque extractable over plain HTTP: JSON/REST endpoints, CSV/Google Sheets, HTML tables, text PDFs (`pdftotext -layout`); (b) only when no HTTP-extractable rows remain, start working `[VISION-DEFERRED]` rows. If the only source is images or scanned PDFs needing a vision model, do NOT extract: mark the row `[VISION-DEFERRED]` and move on to the next HTTP-extractable row.
4. Write `public/data/mosques/gb/{citySlug}/{mosque-id}/{month}.json` files plus a `public/data/mosques.json` registry entry. Set `isHidden: true` when months are missing or the source only has partial data; `false` only for a verified full year.
5. Validate day counts, date ordering, and spot-check values against the source, then seed dev (`npm run seed:dev -- --changed`) and verify. Ask the user for explicit confirmation before seeding prod.
6. Mark the finished row `[DONE]`, add it to the Done section below, and decrement the remaining count.

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

## Done (added outside Sirat gap list)

- [DONE] Darul Elm Masjid and Community Centre (B19) - Jun+Sep 2026 via vision PDF/image (darul-elm.org), hidden (partial year; homepage image is current month)

Rows below marked [DONE] are complete; remaining count: 472.

## How to use this file

- Do NOT import their prayer times. Per project decision, times are re-checked
  from each mosque's own website/source before any data is added.
- Website URLs come from the Sirat directory listing (`website_url`). Spot-checked
  against `GET /v1/mosques/{id}` on 2026-09-03: the detail endpoint returns the
  identical payload, so no per-mosque detail fetch was needed (also kinder to
  their 120 req/min limit). Many entries have no website listed; look those up manually.
- Matching was name + postcode anchored (same full postcode, or same outward code
  with similar name). Generic names in different towns (e.g. two `Masjid Bilal`s)
  are correctly listed as separate mosques.
- Some entries may already appear in `uk-mosque-expansion-shortlist.md`; marked with *.

## Possible duplicates: verify manually before adding

These scored high on name similarity but postcodes differ. Check whether they are
the same mosque under a different address/spelling, or genuinely different mosques.

| Sirat mosque | Sirat address | Closest mosque of ours | Score |
|---|---|---|---|
|---|---|---|---|
| Jame Masjid | 51 Asfordby Street, Leicester, LE5 3QJ | Jame Masjid | 1.0 |
| Jamia Masjid Ghausia | 73 Victoria Road, Lockwood, Huddersfield, HD1 3RT | Jamia Masjid Ghausia | 1.0 |
| Madina Masjid | 225 High Street North, East Ham, London, E6 1JG | Madina Masjid | 1.0 |
| Madni Jamia Masjid | Islamic Cultural & Educational Association, 101 Thornbury Road, Bradford, BD3 8SA | Madni Jamia Masjid | 1.0 |
| Masjid Abu Bakr | 126 Dorset Street, Bolton, BL2 1HR | Masjid Abu Bakr | 1.0 |
| Masjid at-Taqwa | 20 Alexandra Road, Gwent, Casnewydd, NP20 2GY | Masjid At-Taqwa | 1.0 |
| Masjid Bilal | 4 Sarum Road, Luton, LU3 2RA | Masjid Bilal | 1.0 |
| Masjid Bilal | 1-3 Drummond Road, Bradford, BD8 8DA | Masjid Bilal | 1.0 |
| Masjid e Bilal | 52 Bury Old Road, Manchester, Prestwich, M25 0ER | Masjid-e-Bilal | 1.0 |
| Masjid E-Umar | 184 Durham Road, West Yorkshire, Girlington, Bradford, BD8 9HU | Masjid e Umar | 1.0 |
| Masjid Quba | 20 Quba Court (off Church Street), West Yorkshire, Bradford, BD8 7LA | Masjid Quba | 1.0 |
| Masjid Umar | 5-7 Evington Drive, Leicester, LE5 5PF | Masjid Umar | 1.0 |
| Masjid Umar | 68-70 Connaught Rd, Cardiff, CF24 3PX | Masjid Umar | 1.0 |
| Masjid Us Sunnah | 654 Bath Road, Cranford Middlesex, London, TW5 9TN | Masjid Us Sunnah | 1.0 |
| Masjid Usman | 53-55 Shireland Road, Cape Hill, Smethwick, B66 4RG | Masjid Usman | 1.0 |
| Masjid Uthman | 37 Plantagenet St, Cardiff, CF11 6AS | Masjid Uthman | 1.0 |
| Zakariya Masjid | 1 Beadlow Road, Bedfordshire, Luton, LU4 0QY | Zakaria Masjid | 0.966 |
| Alhuda Bolton | The Citadel, Bella Street, Bolton, BL3 4DU | Al-Huda Bolton | 0.963 |
| Madinah Masjid | 128-130 Oak Rd, Luton, LU4 8AQ | Madina Masjid | 0.963 |
| Masjid Noor El Islam | 17 Maria Street, Butetown, Cardiff, CF10 5HH | Masjid Noor-ul-Islam | 0.95 |
| Masjide Noorul Islam | Audley Range, Blackburn, BB1 1TG | Masjid Noor-ul-Islam | 0.95 |
| Zakariyya Masjid | 59 Ribbleton Ave, Preston, PR1 5RX | Zakaria Masjid | 0.933 |
| Masjid e Salaam | 49 Watling Street, Lancashire, Fulwood, PR2 8EA | Masjid Salaam | 0.929 |
| Masjid-e-Noorul Islam | Prospect Street, Bolton, BL1 3QH | Masjid Noor-ul-Islam | 0.927 |
| Madina Masjid & Islamic Centre | 213 Newhampton Road East, Wolverhampton, WV1 4BB | Madina Masjid & Islamic Centre (MMIC) | 0.918 |
| MasjideNoor | Masjid-E-Noor - Address: 327/329 Saint Helens Road, Bolton, BL3 3QD | Masjid e Noor | 0.917 |
| MasjideTaqwa | 48 Holmeswood Road, Bolton, BL3 3HS | Masjid Taqwa | 0.917 |
| Ummah Masjid | 578-600 St Helens Road, Bolton, BL3 3SJ | Jumma Masjid | 0.917 |
| Sleaford Islamic Centre | 3 Station Road, Sleaford, NG34 7RG | Ilford Islamic Centre | 0.909 |
| Sutton Islamic Centre | 62 Oakhill Rd, Sutton, SM1 3AG | Witton Islamic Centre | 0.905 |
| Al-Rawdha Mosque | 401 South Row, Milton Keynes, MK9 2PG | Al-Rahma Mosque | 0.903 |

## Gap mosques by postcode area

### AB (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Central Mosque and Community Centre * | Frederick Street, United Kingdon, Aberdeen, AB24 5HY | no website listed | mosque-000045 |

### AL (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] London Colney Islamic Centre * | 174-174A High Street, Hertfordshire, London Colney, AL2 1JY | https://www.lcic.org.uk/ | mosque-000532 |
| [DONE] St Albans Islamic Centre * | 141 Hatfield Road, St Albans, AL1 4JX | https://icsta.org.uk/contact-us/ | mosque-000203 |
| St. Albans Jamie Masjid * | 77 Hatfield Rd, Hertfordshire, St Albans, AL1 4JL | no website listed | mosque-000359 |
| Welwyn Islamic Society * | 19 Martinfield, Welwyn Garden, AL7 1JG | no website listed | mosque-000267 |

### B (46)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Adam Mosque & Dawah Academy * | 19-31 Brunswick Road, Sparkbrook, Birmingham, B12 8NP | https://dawahacademy.uk/contact-us | mosque-000611 |
| Al Falah Community Support Centre * | 89 Tindal Street, Birmingham, B12 9QU | no website listed | mosque-000599 |
| Al-Habib Trust * | 101 Birchfield Road, Aston, Birmingham, B19 1LH | no website listed | mosque-000460 |
| Amir-e-Millat Mosque and Community Centre * | 144-146 Stoney Lane, Sparkhill, Birmingham, B12 8AQ | no website listed | mosque-000550 |
| Anjuman-e-Naqueb-ul-Islam * | 78-82 Washwood Heath Road, Saltley, Birmingham, B8 1RD | no website listed | mosque-000310 |
| [VISION-DEFERRED] As-Suffa | 156 High Street, Birmingham, B6 4UX | https://as-suffa.org/ | mosque-000368 |
| [DONE] Birmingham Jame Masjid * | Trinity Road, Aston, Birmingham, B6 6AG | https://www.birminghamjamemasjid.org.uk/ | mosque-000285 |
| [DONE] Birmingham Muslim Foundation * | 460-474 Green Lane, Small Heath, Birmingham, B9 5QJ | https://bmf1.co.uk/contact-us/ | mosque-000516 |
| Blackheath Jamia Mosque * | 143 - 150 Malt Mill Lane, Halesowen, B62 8JA | no website listed | mosque-000224 |
| [DONE] Bournville Masjid & Community Centre * | 122 Cob Lane, Birmingham, B30 1QD | https://www.sbmca.org.uk/ | mosque-000548 |
| [DONE] Cradley Heath Central Mosque & Islamic Centre * | Plant Street, West Midlands, Cradley Heath, B64 6EY | http://www.cradleyheathcentralmosque.co.uk/ | mosque-000013 |
| [VISION-DEFERRED] Great Barr Muslim Foundation * | 394 Walsall Road, Birmingham, B42 2LX | https://gbmf.uk/ | mosque-000501 |
| [DONE] Halesowen/Dudley Yemeni Community Association * | Halesowen Cultural Centre, Highfield Lane, Halesowen, B63 4SG | https://www.yca-halesowen.org.uk/contact-us/ | mosque-000308 |
| Hazrat Mujaddid Alf-e-Sani Trust Masjid & Education Centre * | 36 Dennis Road, Balsall Heath, Birmingham, B12 8BG | no website listed | mosque-000390 |
| [DONE] Hazrat Sultan Bahu Trust * | 17-21 Ombersley Road, Balsall Heath, Birmingham, B12 8UR | https://bahutrust.org/contact/ | mosque-000393 |
| [DONE] Huda Masjid and Community Centre * | 1 Unett Street, Birmingham, B19 3BP | https://hudacentre.com/contact/ | mosque-000047 |
| Jamiat-us-Salam | 818 Alum Rock Road, Ward End, Birmingham, B8 2TX | https://www.jamiasalam.com/ | mosque-000295 |
| Kings Heath Masjid * | 113 - 115 Station Road Kings Heath, Birmingham, B14 7TA | no website listed | mosque-000065 |
| [DONE] Lozells Central Mosque * | 213-217 Lozells Road, Lozells, Birmingham, B19 1RJ | https://www.lozellscentralmosque.co.uk/ | mosque-000581 |
| [DONE] Makki Masjid & Madrasa * | 75 Stafford Road, Handsworth, Birmingham, B21 9DU | https://www.makki.org.uk/ | mosque-000435 |
| [DONE] Manarat Foundation | 155 New Coventry Road, Sheldon, Solihull, B26 3DX | https://manaratfoundation.org.uk/ | mosque-000477 |
| Masjid Abu Bakr - Billesley * | 713 Yardley Wood Rd, Billesley, Birmingham, B13 0PT | no website listed | mosque-000139 |
| [DONE] Masjid Abubakr Siddique * | Unit 5, Grove Street, West Midlands, Smethwick, Birmingham, B66 2QS | https://www.masjidabubakr.org.uk/ | mosque-000066 |
| Masjid al-Ummah Sandwell * | 215 High Street, West Midlands, Smethwick, B66 3AH | no website listed | mosque-000235 |
| [VISION-DEFERRED] Masjid Baitul Amaan * | 253 Halfords Lane, Smethwick, B66 1BD | https://masjidbaitulamaan.org.uk/about/ | mosque-000079 |
| [DONE] Masjid e Hamza * | 90 Church Road, Birmingham, B13 9AE | https://masjidhamza.co.uk/ | mosque-000319 |
| Masjid Eesa ibn Maryam * | 14 Etwall Road, Hall Green, Birmingham, B28 0LE | https://arrahma.co.uk/ | mosque-000088 |
| Masjid Imam Al-Shafi'i & Community Centre * | 238 Anthony Road, Alum Rock, Birmingham, B8 3AN | https://www.masjidimamshafii.com/ | mosque-000206 |
| Masjid Mujadidia * | 339 Somerville Rd, Birmingham, B10 9DU | no website listed | mosque-000356 |
| Masjid Qamarul Islam * | 168-170 Fosbrooke Road, Birmingham, B10 9JP | https://masjidqamarulislam.co.uk/ | mosque-000140 |
| Masjid Sunnah Quinton * | 📍 1 Simmons Dr, Quinton, Birmingham, B32 1SL | no website listed | mosque-000342 |
| Masjid Taqwa Birmingham * | 147 Kyrwicks Lane, Birmingham, B11 1SS | no website listed | mosque-000504 |
| Masjid Ul Madni * | 58 Trinity Road, Aston, Birmingham, B6 6NH | https://madnimasjid.com/ | mosque-000546 |
| Masjidus Sunnah An Nabawiyyah * | 125 Mansfield Rd, Aston, Birmingham, B6 6DA | no website listed | mosque-000314 |
| Muslim Students House * | 517 Moseley Rd, Balsall Heath, Birmingham, B12 9BX | no website listed | mosque-000108 |
| Paigham-E-Islam Trust Britain * | 423 Stratford Road, Sparkhill, Birmingham, B11 4LB | https://www.paigham-e-islam.co.uk/contact-us/ | mosque-000594 |
| Qadria Trust * | 26 Alfred Street, Birmingham, B12 8JL | https://www.qadriatrust.com/ | mosque-000615 |
| Soho Hill Muslim School * | 130 Soho Hill, West Midlands, Birmingham, B19 1AF | http://www.sohohillmuslim.org.uk/contact | mosque-000237 |
| Sultan Bahu Centre * | 962 Alum Rock Road, Birmingham, B8 2LS | no website listed | mosque-000009 |
| Sutton Coldfield Muslim Association * | Anchorage Road Sutton Coldfield West Midlands, Royal Sutton Coldfield, B74 2PL | no website listed | mosque-000354 |
| The Mosque of Brayatee * | 288 Camden Street, Birmingham, B18 7PW | no website listed | mosque-000119 |
| UKIM Handsworth Islamic Centre * | 27 Putney Road, Handsworth, Birmingham, B20 3PP | no website listed | mosque-000029 |
| Umar Masjid & Community Centre * | 318 Long Lane, Halesowen, B62 9LD | no website listed | mosque-000089 |
| West Bromwich Jami Masjid & Islamic Centre * | 67 Dartmouth St, West Bromwich, B70 8BZ | no website listed | mosque-000213 |
| Yemeni Community Association in Sandwell * | Greets Green Access Centre, Tildasley Street, West Midlands, West Bromwich, B70 9SJ | https://www.yca-sandwell.org.uk/ | mosque-000493 |
| Zumunta Community * | Unit 39, Newtown Shopping Centre, Birmingham, B19 2SS | https://zumuntacommunity.org/ | mosque-000321 |

### BA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Trowbridge Mosque * | 54 Longfield Road, Trowbridge, BA14 7AD | https://www.trowbridgemasjid.org/ | mosque-000366 |

### BB (14)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Clithero Mosque * | 93-97 Lowergate, Lancashire, Clitheroe, BB7 1AG | no website listed | mosque-000195 |
| [VISION-DEFERRED] Daneshouse Masjid * | 53 Daneshouse Road, Burnley, BB10 1AF | https://www.diec.org.uk/ | mosque-000543 |
| [VISION-DEFERRED] Jame Masjid-e-Noor * | 71 Saunders Road, Lancashire, Blackburn, BB2 6LS | https://masjidenoor.org/ | mosque-000120 |
| Jamia Masjid Usman Ghani * | Stanley Street, Nelson, Brierfield, BB9 5DL | no website listed | mosque-000287 |
| Jamia Mosque Sultania & Education Centre * | Sackville Street, Lancashire, Nelson, Brierfield, BB9 5LE | no website listed | mosque-000498 |
| [DONE] Jamiatul Ilm Wal Huda | 30 Moss Street, Blackburn, BB1 5JT | https://www.jamiah.co.uk/ | mosque-000260 |
| [DONE] Lammack Prayer Room * | Whinney Lane, Lancashire, Blackburn, BB2 7BX | https://lammack.org/ | mosque-000450 |
| [DONE] Madina Masjid Darwen * | 21-23 Victoria Street, Darwen, BB3 3HB | https://darwenmosque.co.uk/ | mosque-000299 |
| Masjid E Sajedeen * | Plane Tree Rd, Blackburn, BB1 5PA | no website listed | mosque-000046 |
| Masjid e Saliheen (Blackburn) * | Masjid e Saliheen Didsbury Street Blackburn Lancashire, Blackburn, BB1 3JL | no website listed | mosque-000531 |
| MASJID-E-ANISUL ISLAM * | Troy Street, Lancashire, Blackburn, BB1 6NY | no website listed | mosque-000016 |
| [VISION-DEFERRED] Taleem Ul Islam * | 1-15, Whalley Old Road, Cob Wall, Blackburn, BB1 5JJ | https://taleemulislam.org.uk/ | mosque-000293 |
| [VISION-DEFERRED] UKIM Ibrahim Masjid * | 2 Clegg Street, Lancashire, Burnley, BB10 1AX | https://ibrahimmasjid.co.uk/contact-us/ | mosque-000112 |
| UKIM Madina Masjid Nelson * | 144 Manchester Road, Nelson, BB9 7AH | no website listed | mosque-000534 |

### BD (14)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Jamia Suffa-Tul-Islam Grand Mosque * | Horton Park Avenue, West Yorkshire, Bradford, BD5 0LD | https://www.bradfordgrandmosque.co.uk/ | mosque-000585 |
| Alhira Islamic Centre * | 12 Marsh St, Bradford, BD5 9NE | no website listed | mosque-000127 |
| BD5 Masjid * | 49 Hastings Street, West Yorkshire, Bradford, BD5 9PQ | https://www.bd5masjid.com/ | mosque-000559 |
| Ghosiyah Masjid * | 206A Skipton Road, West Yorkshire, Keighley, BD21 2TA | no website listed | mosque-000453 |
| Islam Bradford * | IslamBradford, 1 City Road, West Yorkshire, Bradford, BD8 8ER | no website listed | mosque-000433 |
| Jamia Masjid Naqshbandia Aslamia * | 63 Tile Street, Bradford, BD8 8NX | no website listed | mosque-000001 |
| Jamia Masjid Shan-e-Islam * | 80 Beamsley Rd, Frizinghall, Shipley, BD18 2DR | https://www.shaneislam.co.uk | mosque-000176 |
| Jamiyat Tabligh ul Islam * | 87-89 Ryan Street, West Bowling, Bradford, BD5 7AP | no website listed | mosque-000125 |
| Jamiyat Tablighul Islam - Coventry Street * | 45 Coventry Street, East Bowling, Bradford, BD4 7HX | https://www.jamiyat.org/ | mosque-000177 |
| Madressa Khaliliya & Education Centre (Masjid-e-Usman) * | 57 Upper Seymour Street, Bradford, BD3 9LJ | https://www.bsmks.org.uk | mosque-000172 |
| Masjid Ibraheem & Education Centre * | Crofts Hall Lower Rushton Road, Bradford, BD3 8PX | no website listed | mosque-000492 |
| Masjid Noorul Islam Bradford * | Masjid Noorul Islam 58-62 St Margaret’s Road, West Yorkshire, Bradford, BD7 3AE | no website listed | mosque-000068 |
| Tawakkulia Jamia Masjid * | 48 Cornwall Road \| Bradford \|, Bradford, BD8 7JN | no website listed | mosque-000149 |
| Victor Street Masjid * | Victor Street, Manningham, Bradford, BD9 4RB | no website listed | mosque-000495 |

### BH (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Bournemouth Islamic Centre & Central Mosque * | 4 St Stephen's Rd, Bournemouth, BH2 6JJ | no website listed | mosque-000315 |

### BL (8)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Rahman Masjid * | 2-14 Randal Street, Bolton, BL3 4AG | no website listed | mosque-000335 |
| Azhar Academy Bolton * | Devonshire Education Centre, 20 Devonshire Road, Lancashire, Heaton, Bolton, BL1 4PG | https://www.azharacademybolton.org/about-us | mosque-000469 |
| Hulton Lane Centre for Education * | Linnyshaw Close, Bolton, BL3 4WL | https://tafseer-raheemi.com/introduction-raheemi-academy-hulton-lane-centre-hlc-bolton-27119/ | mosque-000336 |
| Imaan Masjid * | 270 Bridgeman Street, Bolton, BL3 6SA | no website listed | mosque-000201 |
| Jamia Khizra Mosque and Islamic Centre, Bury * | 21-25 Parker Street, Bury, BL9 0RJ | https://www.khizramosquebury.com/ | mosque-000408 |
| Khizra Mosque - Walmersley Road * | 85 Walmersley Road, Bury, BL9 5AN | https://www.khizramosquebury.com/ | mosque-000146 |
| MA Mission UK * | 365 Halliwell Road, Bolton, BL1 8DE | https://mamissionuk.com/ | mosque-000220 |
| Zakariyya Jaame Masjid * | Zakariyya Jaam’e Masjid 20 Peace Street, Bolton, BL3 5LJ | no website listed | mosque-000506 |

### BN (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Medinah Mosque * | 24 Bedford Place, Brighton, Brighton and Hove, BN1 2PT | https://almedinah.co.uk/about-us | mosque-000389 |
| Brighton Mosque * | 150 Dyke Road, Brighton, BN1 5PA | no website listed | mosque-000422 |
| Eastbourne Mosque * | 40 Ashford Square, Eastbourne, BN21 3TX | no website listed | mosque-000574 |

### BR (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Emaan Centre * | Croydon road, Kent, Keston, London, BR2 8HF | no website listed | mosque-000510 |
| Bromley Islamic Centre * | High Street, Bromley, BR1 1EY | https://www.bromleyislamiccentre.org.uk/ | mosque-000296 |
| Taqwaa Social & Cultural Society - Friday Prayers * | St Francis of Assisi Church Hall, Greencourt Road, Orpington, Petts Wood, London, BR5 1QW | https://www.tscs.org.uk/friday/ | mosque-000104 |

### BS (7)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Bristol Central Mosque * | Owen Street, Easton, Bristol, BS5 6AP | no website listed | mosque-000133 |
| Bristol jamia Mosque * | Green St, Totterdown, Bristol, BS3 4UB | no website listed | mosque-000189 |
| [VISION-DEFERRED] Easton Jamia Masjid * | St Marks Road, Easton, Bristol, BS5 6JH | https://eastonjamiamasjid.co.uk/about-us/ | mosque-000508 |
| Greenbank Masjid * | Castle Green Buildings, Greenbank Road, Bristol, BS5 6HE | no website listed | mosque-000360 |
| Hazrat Bilal Masjid /Centre * | 41 Sevier Street, St.Werburghs, Bristol, BS2 9QX | no website listed | mosque-000385 |
| [DONE] Quran Academy * | 26 Abingdon Road, Fishponds, BS16 3NY | https://www.quranacademy.org.uk/ | mosque-000443 |
| Weston Islamic Education Centre * | 66 Palmer Street, Weston-super-Mare, BS23 1RU | no website listed | mosque-000595 |

### CA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Carlisle Islamic Centre * | 1-3 Brook St, Carlisle, CA1 2JA | no website listed | mosque-000338 |

### CB (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Cambourne Jumu’ah Salaah | Cambourne Community Hub, High Street, Cambridge, Cambourne, CB23 6GW | https://www.cambournecrescent.org/ | mosque-000242 |
| Ely Mosque * | Ely Islamic Centre 34 Broad Street, Ely, CB7 4AH | no website listed | mosque-000283 |
| Five Bells - Modern Islamic Centre * | 16 St Mary’s Square, Newmarket, CB8 0HZ | https://newmarketmosque.com/?page_id=156 | mosque-000432 |
| Omar Faruque Mosque and Cultural Centre * | Kirkwood Road, off King's Hedges Road, Cambridge, CB4 2PF | no website listed | mosque-000397 |
| SHAH-JALAL \| ISLAMIC CENTRE * | 107 Darwin Dr, Arbury, Cambridge, CB4 3HQ | no website listed | mosque-000032 |

### CF (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Ikhlas Centre * | Al Ikhlas Culture and Education Centre Address: 92 Broadway, Cardiff, CF24 1NH | no website listed | mosque-000211 |
| Al-Manar Centre * | 4 Glynrhondda St, Cardiff, CF24 4AN | no website listed | mosque-000488 |
| Dar Ul-Isra | 21-23 Wyeverne Rd, Cardiff, CF24 4BG | no website listed | mosque-000186 |
| [DONE] Madina Mosque Cardiff * | Lucas Street, Cardiff, CF24 4NZ | https://madinamosquecardiff.org/ | mosque-000409 |
| South Wales Islamic Centre * | Alice Street, Butetown, Cardiff, CF10 5LB | no website listed | mosque-000207 |

### CM (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Harlow Islamic Centre * | Parringdon Road, Essex, Harlow, CM19 4QX | no website listed | mosque-000257 |
| Herts and Essex Mosque * | Millars, 2 South Mill Road, Bishop's Stortford, CM23 3DH | no website listed | mosque-000423 |
| Maldon District Islamic Cultural Association * | Muslim Hall, Church Street, Maldon, CM9 5HP | https://maldonmosque.org.uk/ | mosque-000499 |

### CO (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Colchester Jamiah Masjid * | 2-3 Priory Street, Essex, Colchester, CO1 2PY | no website listed | mosque-000238 |

### CR (9)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Fatihah Mosque * | Coombe Farm, Oaks Rd, London, CR0 5HL | no website listed | mosque-000467 |
| Al-Khair Foundation Prayer Room and Hall * | 109-119 Cherry Orchard Road, Croydon, CR0 6BE | https://www.alkhair.org/ | mosque-000038 |
| Al-Madina Mitcham Islamic Centre * | 201A Streatham Road, Mitcham, London, CR4 2AJ | https://almadina.cfsites.org/custom.php?pageid=28993 | mosque-000044 |
| Alhidaya Croydon Masjid * | 177 Brigstock Road, London, CR7 7JP | https://alhidayacroydon.org/ | mosque-000247 |
| Croydon Mosque & Islamic Centre * | 525 London Road, Surrey, Thornton Heath, London, CR7 6AR | https://www.croydonmosque.com/ | mosque-000057 |
| Makkah Masjid Mitcham * | 226 London Road, Mitcham, London, CR4 3HD | https://www.makkah-masjid-mitcham.org/ | mosque-000019 |
| Makkah Masjid Mitcham * | 226 London Rd, Mitcham, London, CR4 3HD | https://www.makkah-masjid-mitcham.org/ | mosque-000584 |
| Purley Masjid * | 130 Brighton Road, Surrey, Purley, CR8 4EX | no website listed | mosque-000300 |
| Thornton Heath Islamic Centre * | 150 Gillett Road Thornton Heath Surrey, London, CR7 8SN | no website listed | mosque-000190 |

### CT (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Birr Community Centre and Mosque * | Union Crescent, Margate, CT9 1NR | no website listed | mosque-000117 |
| Canterbury Mosque * | The Markaz, 1 Giles Lane, Canterbury, CT2 7LT | no website listed | mosque-000608 |

### CV (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Faizan-e-Islam * | 202 Lockhurst Lane, Foleshill, Coventry, CV6 5NJ | https://dawateislamimidlands.net/prayer-time-table/ | mosque-000023 |
| [DONE] IQRA Masjid * | 176-184 Allesley Old Road, Coventry, CV5 8GJ | https://www.iqracentre.org/ | mosque-000426 |
| Rugby Mosque * | Grosvenor Road, Rugby, CV21 3LE | https://rugby-mosque.org/contact-us/ | mosque-000410 |
| [VISION-DEFERRED] Shah Jalal Mosque * | 75 Smith St, Coventry, CV6 5DX | no website listed | mosque-000347 |
| [VISION-DEFERRED] Umar Education and Welfare Centre * | 137 Avon Street, Coventry, CV2 3GQ | https://uewt.co.uk/ | mosque-000383 |

### DA (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Dartford Masjid and Islamic Centre (DMIC) * | 2 Westgate Road Dartford Kent, Dartford, DA1 2AR | no website listed | mosque-000078 |
| Gravesend Central Mosque * | Albion Terrace, Kent, Gravesend, DA12 2SX | https://gravesendcentralmosque.com/ | mosque-000540 |

### DE (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Derby Jamia Mosque * | 6 Rose Hill Street, Derby, DE23 8GA | https://derbyjamiamosque.co.uk/ | mosque-000475 |
| Makki Masjid Burton * | Address 18 Victoria Crescent, Burton upon Trent, DE14 2QA | no website listed | mosque-000020 |

### DG (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Dumfries Islamic Society * | 243 Annan Road, Dumfries, DG1 3HB | no website listed | mosque-000222 |

### DN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Grimsby Islamic Cultural Centre * | 79A Weelsby Road, Grimsby, DN32 0PY | http://www.gicconline.com/ | mosque-000136 |

### DY (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| NIT Masjid * | 61 Cinder Bank, Netherton, Dudley, DY2 9BH | https://nit.org.uk/ | mosque-000184 |

### E (59)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Albirr Foundation | 106 Church Road, London, Leyton, E10 5HG | https://www.albirr.com/ | mosque-000250 |
| Anjuman-e-Islamia Newham | 266 High St N, London, E12 6SB | no website listed | mosque-000278 |
| Ashaadibi Masjid & Community Hub * | 167 Cannon Street Road, London, E1 2LX | https://ashaadibi.co.uk/contact/ | mosque-000575 |
| Baitul Aman - Mosque and Cultural Centre * | Baitul Aman Mosque 101 Braintree Street London, Stepney, E2 0FT | no website listed | mosque-000618 |
| Baitul Mamur Masjid * | 191 Roman Road, London, Bethnal Green, E2 0QY | no website listed | mosque-000567 |
| Baitur Rahman Masjid * | 440 High Street North, Manor Park, London, E12 6RH | https://www.baiturrahmanmasjid.co.uk/ | mosque-000272 |
| Beckton Muslim Centre * | 18 Warwall, Winsor Park, Beckton, London, E6 6WG | no website listed | mosque-000223 |
| Bishops Way Mosque * | 73 Bishops Way, London, Bethnal Green, E2 9HF | https://bishopswaymosque.co.uk/ | mosque-000438 |
| Bow Central Mosque * | 246 Bow Road London, Bow, E3 3AP | no website listed | mosque-000053 |
| Bow Muslim Community Centre * | 515B-517 Roman Road, London, E3 5EL | https://www.bowmosque.co.uk/ | mosque-000076 |
| Bromley by Bow Bangladeshi Forum & Muslim Cultural Centre * | Ground Floor, Devon Tenants Hall, Powis Road, London, E3 3NL | no website listed | mosque-000452 |
| Burhan Uddin Masjid * | 2A Buckfast Street, London, Bethnal Green, E2 6EY | no website listed | mosque-000251 |
| Cann Hall Masjid * | 145 Cann Hall Rd, London, Leyton, E11 3NJ | no website listed | mosque-000144 |
| Chingford Islamic Society * | 90-92 Chingford Mount Road, London, Chingford, E4 9AA | http://www.chingfordmasjid.com/ | mosque-000617 |
| Collingwood Street Cultural Centre & Jame Masjid * | 4 Ashington House, 28 Barnsley Street, London, Bethnal Green, E1 5RD | no website listed | mosque-000021 |
| Coventry Cross Mosque & Islamic Community Centre * | Flat 6 Broxbourne House, Empson Street, London, E3 3LJ | no website listed | mosque-000256 |
| Darul Uloom Qadria Jilania - Walthamstow * | Darul Uloom Qadria Jilania, 12 East Ave, London, Walthamstow, E17 9NG | no website listed | mosque-000462 |
| East Ham Islamic Centre * | 79 Market Street, London, East Ham, E6 2RD | no website listed | mosque-000261 |
| Forest Gate Central Masjid * | 447-451 Romford Road, Forest Gate, London, E7 8AB | https://forestgatecentralmasjid.org/ | mosque-000547 |
| Globe Town Mosque & Cultural Centre * | 100 Roman Road, London, E2 0RN | no website listed | mosque-000349 |
| Green Street Masjid * | 88 Green Street, London, E7 8JG | https://greenstreetmasjid.org/contact-us/ | mosque-000157 |
| Hackney Central Masjid * | 237 Well Street, London, Hackney, E9 6RG | https://www.hackneyjamah.com/jummah | mosque-000198 |
| Hamlets Way Masjid * | 97-103 Hamlets Way, London, E3 4TL | https://hamletswaymosque.com/ | mosque-000330 |
| Hind Grove Masjid & Cultural Centre * | 162 Pigott Street, London, E14 7DW | no website listed | mosque-000034 |
| International Khatme Nubuwwat Movement / St Georges Road Masjid * | 11-13 St George Road, Forest Gate, London, E7 8HT | no website listed | mosque-000556 |
| Islamic Dawah Centre * | 398 High Street North, London, E12 6RH | https://idcuk.org/demo/contact/ | mosque-000607 |
| Jamia Darus Sunnah London * | 98 Woodgrange Road, London, E7 0EW | no website listed | mosque-000324 |
| Khidmah Academy * | 47 Vicarage Lane, London, Stratford, West Ham, E15 4HG | no website listed | mosque-000101 |
| Lansbury Estate Masjid * | 20 Alton Street, London, E14 6BZ | https://www.lansburymasjid.co.uk | mosque-000036 |
| Leyton Jamia Masjid * | Muslim Community Trust 324-328 High Rd, London, Leyton, E10 5PW | no website listed | mosque-000193 |
| Leytonstone Islamic Association * | Dacre Road, Leytonstone, London, E11 3AG | https://www.lia-trust.org/ | mosque-000155 |
| Limehouse Masjid * | 304-306 Stocks Place, London, E14 8AE | https://www.limehousemasjid.org.uk | mosque-000083 |
| Locksley Estate Mosque * | 7 Lydbrook Place, Salmon Lane, London, E14 7TU | no website listed | mosque-000322 |
| Madina Jame Masjid Docklands * | 248 Westferry Road, London, E14 3AG | https://madinamasjiddocklands.org.uk/ | mosque-000154 |
| Madina Mosque Trust * | 2a Lea Bridge Road Clapton, London, E5 9QD | no website listed | mosque-000254 |
| Masjid Abdul-Aziz Bin Bāz * | East Road, London, West Ham, E15 3QR | https://masjidbinbaz.com/ | mosque-000072 |
| Masjid Al-Fath / Hifzul Quran Islamic Education Centre * | 304-306 Burdett Road, London, E14 7DQ | https://hqiec.co.uk/ | mosque-000277 |
| Masjid Al-Hikmah * | 72, 74 Selwyn Road, London, E13 0PY | no website listed | mosque-000106 |
| Masjid Darul Ilm * | 16-18 Pilgrims Way, London, East Ham, E6 1HW | https://slmcel.org.uk/ | mosque-000350 |
| Masjid Ul Hidayah * | 2A Church Road, Manor Park, London, E12 6AQ | https://www.masjidulhidayah.co.uk/ | mosque-000248 |
| Masjid-E-Quba, Forest Gate * | 198 Shrewsbury Road, London, E7 8QJ | no website listed | mosque-000551 |
| Mazahirul Uloom Masjid * | 241-243 Mile End Road, Stepney, E1 4AA | no website listed | mosque-000340 |
| PLASHET GROVE MASJID * | 175-179 Plashet Grove, East Ham, London, E6 1BX | no website listed | mosque-000613 |
| Poplar Central Mosque * | 253 East India Dock Road, Poplar, London, E14 0EG | https://www.poplarmosque.co.uk/ | mosque-000417 |
| Poplar Mosque and Community Centre * | 6 Webber Path, Poplar, London, E14 0FZ | no website listed | mosque-000061 |
| Poplar Shahjalal Jame Masjid * | Address 25 Hale St, Poplar, London, E14 0BF | no website listed | mosque-000188 |
| Quwwat-ul-Islam Society * | 62-66 Upton Lane, Forest Gate, London, E7 9LN | https://quwwatulislam.org/ | mosque-000570 |
| Shadwell Gardens Masjid * | 129 Shadwell Gardens, London, E1 2QL | no website listed | mosque-000373 |
| Shadwell Jame Masjid * | 143-145 Martha Street, London, E1 2QB | https://shadwelljamemasjid.org.uk/ | mosque-000494 |
| Stratford Islamic Association * | 3-5 Brydges Road, Stratford, London, E15 1NA | https://www.stratfordislamicassociation.com | mosque-000197 |
| SWIC | Primrose Rd, London, Woodford, E18 1DD | no website listed | mosque-000538 |
| Teviot Masjid * | 181 Teviot Street, London, E14 6PY | no website listed | mosque-000074 |
| The Markazi Masjid London * | 9-11 Christian Street, London, E1 1SE | https://www.markazimasjid.org/ | mosque-000011 |
| The Shade | Unit 1 Church Road Studios, 62 Church Road, Manor Park, London, E12 6AF | https://theshade.org/contact/ | mosque-000343 |
| Turners Road Masjid * | 11 Bangla Close, rear of 40 Turners Road, London, E3 4YD | https://turnersroadmasjid.org/ | mosque-000173 |
| UKIM Masjid Ibrahim & Islamic Centre * | 721-723 Barking Road, London, E13 9EU | https://www.masjidibrahim.co.uk/ | mosque-000459 |
| Waltham Forest Noor Ul Islam * | 711-715 High Road, London, Leyton, E10 5AB | no website listed | mosque-000381 |
| Weaversfield Muslim Prayer Hall * | 3A Railway Arch, Brady Street, London, E1 5DT | https://weaversfield-muslim-prayer-hall.ueniweb.com/ | mosque-000437 |
| Westferry Community Masjid * | 2 The Quarterdeck, London, E14 8SJ | no website listed | mosque-000451 |

### EC (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Halls4Jumu’ah - Golden Lane | Golden Lane Sport & Fitness, Fann Street, London, EC1Y 0SH | https://www.halls4jumuah.org/zuhr-prayer-times | mosque-000363 |
| Holborn Mosque * | 33 Brookes Court, Baldwins Gardens, London, EC1N 7RR | https://www.holbornmosque.org/contact-us | mosque-000328 |

### EH (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Bathgate Mosque * | 5 Whitburn Road, Bathgate, EH48 1HE | no website listed | mosque-000589 |
| Polwarth Masjid * | 8-10 Temple Park Cresent, Edinburgh, EH11 1HT | no website listed | mosque-000073 |

### EX (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Exeter Mosque * | 12-13 York Road, Devon, Exeter, EX4 6PG | https://exetermosque.org.uk/ | mosque-000588 |
| North Devon Islamic Culture Centre * | 9 Vicarage Street, Barnstaple, EX32 7BT | no website listed | mosque-000148 |

### FK (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Falkirk Central Mosque Anwar-e-Madina * | 10 Burnhead Lane, Falkirk, FK1 1UG | no website listed | mosque-000353 |
| Falkirk Islamic Centre * | 6-8 Burnhead Lane, Falkirk, FK1 1UG | https://falkirkislamiccentre.org/contact/ | mosque-000054 |

### G (8)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [DONE] Al Rahmah Community Centre * | 10 Grovepark Place, Glasgow, G20 7NG | no website listed | mosque-000024 |
| [DONE] Al-Furqan Mosque * | 19 Carrington Street, Glasgow, G4 9AJ | https://alfurqanmosque.com/contact/ | mosque-000592 |
| Bishopbriggs Islamic Community Centre * | 173 Auchinairn Road Bishopbriggs Glasgow, Bishopbriggs, G64 1NG | no website listed | mosque-000131 |
| BMACC | 1 Speirs Rd, Glasgow, Bearsden, G61 2LX | no website listed | mosque-000346 |
| Faizan E Attar - East Kilbride Islamic Centre * | 2c Alison Lea, East Kilbride, G74 3HW | no website listed | mosque-000484 |
| [DONE] Glasgow Mena Centre * | 83-85 Lister Street, Glasgow, G4 0BZ | https://www.menatrust.org.uk/contact/ | mosque-000052 |
| Islamic Education Trust Cumbernauld * | 5 Craighalbert Way, Lanarkshire, Cumbernauld, G68 0LS | https://islamictrust.org/contact-us/ | mosque-000411 |
| [DONE] Jamia Islamia Glasgow * | 275 Tantallon Road, Glasgow, G41 3JW | no website listed | mosque-000259 |

### GU (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Shah Jahan Mosque * | 149 Oriental Road, Surrey, Woking, GU22 7BA | https://shahjahanmosque.org.uk/home/contact/ | mosque-000167 |

### HA (11)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Edgware Central Mosque * | 48 High St, Edgware, HA8 7EJ | no website listed | mosque-000523 |
| Edgware Islamic Cultural Trust * | 82 Chandos Cres London, Stanmore, HA8 6HL | no website listed | mosque-000227 |
| Harrow Central Mosque * | 34 Station Road, London, Harrow, HA1 2SQ | no website listed | mosque-000265 |
| Islamic Centre Edgware * | 9D Deansbrook Road, Edgware, London, HA8 9BE | https://islamiccentreedgware.org/ | mosque-000290 |
| Islamic Cultural Centre Wembley * | 72-74 Harrow Road, Middlesex, Wembley, London, HA9 6PL | no website listed | mosque-000374 |
| Mahfil Ali | 39 Gloucester Road, Middlesex, Harrow, London, HA1 4PR | no website listed | mosque-000357 |
| Markaz us-Sunnah * | 500 Sunleigh Road, Alperton, London, HA0 4NF | no website listed | mosque-000466 |
| SLMCC | 2 Whitefriars Avenue, Middlesex, London, HA3 5RN | no website listed | mosque-000461 |
| Taiba Welfare Foundation * | Pride House, Rectory Lane, Edgware, HA8 7LG | https://taibafoundation.org/ | mosque-000529 |
| The Guidance Centre * | 102 Victoria Road, Ruislip, HA4 0AL | no website listed | mosque-000478 |
| Wembley Central Masjid * | 35-37 Ealing Road, Middlesex, Wembley, HA0 4AE | no website listed | mosque-000386 |

### HP (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Aylesbury Mosque * | Havelock Street, Aylesbury, HP20 2NX | no website listed | mosque-000134 |
| Aylesbury Vale Islamic Centre * | Unit 10, Chamberlain Road, Aylesbury, HP19 8DY | https://aylesburyislamiccentre.com/ | mosque-000471 |
| Baytus Salaam * | Stevenage Rise, Hemel Hempstead, HP2 6BH | https://www.dbwa.org.uk/contact/ | mosque-000439 |
| Muslim Education Centre and Welfare Trust * | 3-4 The Parade, Totteridge Drive, High Wycombe, HP13 6UH | https://www.mecawt.co.uk/yourcentre/salahtimes/ | mosque-000571 |
| Wycombe Mosque * | 34 Jubilee Road, High Wycombe, HP11 2PG | https://www.wycombemosque.com/about-us | mosque-000505 |

### HU (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Hull Mosque & Islamic Centre * | 2 Berkeley Street Hull, Kingston upon Hull, HU3 1PR | no website listed | mosque-000026 |

### HX (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Markazi Jamia Masjid Ghousia (Ahle Sunnat Wa Jamaat) * | 49 Rhodes Street, West Yorkshire, Halifax, HX1 5DE | no website listed | mosque-000035 |

### IG (13)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Madina Mosque Barking * | 2 Victoria Rd, Barking, London, IG11 8PY | no website listed | mosque-000483 |
| Al Noor Masjid * | 170 Gascoigne road, Essex, Barking, IG11 7LH | no website listed | mosque-000344 |
| AL-Ansar IEC | 833-835 High Rd Goodmayes Essex, London, IG3 8TD | no website listed | mosque-000339 |
| Darul Ihsaan Barking * | 86 Longbridge Road, Barking, IG11 8SF | no website listed | mosque-000093 |
| [VISION-DEFERRED] Eman Foundation | 2A Ashgrove Road, Ilford, London, IG3 9XE | https://emanfoundation.co.uk/contact | mosque-000200 |
| Hedgecock Community Centre * | 28 Stephen Jewers Gardens, Barking, IG11 9FA | https://hedgecockcentre.org.uk/contact/ | mosque-000219 |
| Jabir Bin Zayd Islamic Centre * | 11-13 Broadway, East London, Barking, IG11 7LS | https://ahlulistiqamah.co.uk/index.php/en/about | mosque-000168 |
| [DONE] Masjid Al-Falah * | North Ilford Islamic Centre, 97 Kensington Gardens, Essex, Ilford, London, IG1 3EN | https://masjid-alfalah.org.uk/about | mosque-000587 |
| MasjidAdam | 64 Seven Kings Road, Ilford Essex, Ilford, IG3 8DG | no website listed | mosque-000196 |
| Newbury Park Masjid * | 117 Oaks Ln, Ilford, Newbury Park, London, IG2 7PY | no website listed | mosque-000102 |
| Riverside Muslim Association (RMA) * | Rivergate Centre, Minter Road, Barking, IG11 0FJ | no website listed | mosque-000612 |
| [DONE] Seven Kings Muslim Educational Trust * | 645-647 High Road, Ilford, Seven Kings, London, IG3 8RG | https://skmet.org/ | mosque-000109 |
| Thames View Muslim Association * | 15B Farr Avenue, Barking, IG11 0NZ | https://www.tvmacharity.org.uk/Contact.html | mosque-000077 |

### IP (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Ipswich Mosque * | 32-36 Bond Street, Ipswich, IP4 1JE | no website listed | mosque-000249 |
| Shahjalal Islamic Centre & Masjid * | 15 Argyle Street, Suffolk, Ipswich, IP4 2NE | https://shahjalalmasjidipswich.co.uk/contact-us | mosque-000486 |

### KA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Ayrshire Central Mosque * | 58 Hill Street, Kilmarnock, KA3 1JD | no website listed | mosque-000399 |

### KT (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| New Malden Jummah | SMT Manor Park Hall, Malden Road, New Malden, London, KT3 6AU | https://www.newmaldenjummah.co.uk/ | mosque-000323 |

### KY (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Fife Islamic Centre - Noor-e-Madina Mosque * | 786 Poplar Road, Glenrothes, KY7 4AA | https://www.fifeislamiccentre.co.uk/ | mosque-000017 |
| Fife Muslim Educational & Cultural Centre - Cadham * | Huntsman House, 33 Cadham Centre, Glenrothes, KY7 6RU | https://fife.go2masjid.website | mosque-000564 |

### L (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Liverpool Mosque & Islamic Institute * | 8 Cramond Ave, Liverpool, L18 1EQ | no website listed | mosque-000416 |
| Liverpool Muslim Society / Al Rahma Mosque * | 29-31 Hatherley Street, Liverpool, L8 2TJ | http://www.liverpoolmuslimsociety.org.uk/ | mosque-000002 |

### LA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Lancaster Islamic Society * | 7 Dallas Road, Lancaster, LA1 1TN | https://lancasterisoc.org/ | mosque-000121 |

### LE (11)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Furqan Centre * | 1 Kamloops Cres, Leicester, LE1 2HX | no website listed | mosque-000234 |
| Darul Arqam Educational Trust * | 16 Thurmaston Lane, Leicester, LE5 0TE | https://datrust.org/ | mosque-000306 |
| Madani Masjid * | 77 Evington Valley Road, Evington, Leicester, LE5 5LL | https://madani.school/community | mosque-000228 |
| Madrasah Abu Hurairah * | 9 Haynes Road, Leicester, LE5 4AR | https://madrasahabuhurairah.co.uk/ | mosque-000371 |
| Madrasah Baytul ‘Ilm (Masjid Ibrāheem) * | Spinney Hill Road, Leicester, LE5 3GH | https://baytulilm.org/ | mosque-000502 |
| Masjid Abdullah ibn Masud * | 20 Hallaton Street, Leicester, LE2 8QU | no website listed | mosque-000487 |
| Masjid An Noor * | 170a Belgrave Gate, Leicester, LE1 3XL | no website listed | mosque-000180 |
| Muhaddith E Azam Mission Leicester * | 170 Prestwold Rd, Leicester, LE5 0EZ | no website listed | mosque-000040 |
| Tajdaar-e-Madina * | 1A Garendon Street, Leicester, LE2 0AH | https://temadina.co.uk/ | mosque-000240 |
| The Islamic Foundation * | Ratby Lane, Leicestershire, Markfield, LE67 9SY | https://www.islamic-foundation.org.uk/ | mosque-000153 |
| The Leicester Central Mosque * | Conduit Street, Leicester, LE2 0JN | https://www.islamiccentre.org/contact-us-topmenu-18/1-the-leicester-central-mosque | mosque-000162 |

### LL (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Rhyl Masjid & Islamic Cultural Centre * | 30 Water Street, Rhyl, LL18 1SS | no website listed | mosque-000163 |

### LN (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Lincoln Central Mosque * | Dixon Street, Lincoln, LN6 7DA | https://lincolncentralmosque.org.uk/ | mosque-000414 |

### LS (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Iqra Centre * | 4-6 Carr Manor Crescent, Moortown, Leeds, LS17 5DH | https://www.iqracentre.org.uk/ | mosque-000303 |
| Leeds Islamic Centre * | 48 Spencer Place, Leeds, LS7 4BR | https://www.leedsic.com/contact.php | mosque-000614 |
| Masjid e Quba Leeds * | 24 Shepherds Lane, Leeds, LS8 4LG | http://www.alhassan.org.uk/ | mosque-000597 |
| Masjid Ibraheem * | 4 Woodview Rd, Leeds, LS11 6LE | no website listed | mosque-000006 |
| Osmondthorpe Lane Islamic Centre * | Unit 4 Osmondthorpe Ln, Osmondthorpe, Leeds, LS9 9EG | no website listed | mosque-000055 |

### LU (6)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Jalal Masjid * | Al-Jalal Masjid, 314 Biscot Road, Luton, LU3 1AZ | no website listed | mosque-000364 |
| [VISION-DEFERRED] Central Mosque Luton * | 2-12 Westbourne Road, Luton, LU4 8JD | https://lutoncentralmosque.org/ | mosque-000059 |
| Hockwell Ring Masjid * | 13-17 Barley Lane. Luton. Beds, Luton, LU4 9HT | no website listed | mosque-000230 |
| [DONE] Leagrave Hall Masjid * | 145 High Street, Luton, LU4 9LE | https://leagravehallmasjid.com/ | mosque-000376 |
| Leagrave Hall Masjid * | 79-81 Leagrave Road, Luton, LU4 8HT | https://leagravehallmasjid.com/ | mosque-000536 |
| Luton Islamic Centre * | 116 Bury Park Rd, Luton, LU1 1HE | no website listed | mosque-000558 |

### M (14)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Raza Foundation | 8-16 Park Grove, Manchester, M19 3AQ | https://alrazafoundation.org.uk/ | mosque-000434 |
| Anwaar ul Haramain Jamé Masjid Manchester * | 3 Woodlands Rd, Manchester, M8 9JW | no website listed | mosque-000028 |
| British Muslim Heritage Centre * | College Road, Whalley Range, Manchester, M16 8BP | no website listed | mosque-000080 |
| Darus Salam Mosque & Islamic Centre * | 41-47 Slade Lane, Longsight, Manchester, M13 0QJ | no website listed | mosque-000372 |
| Eccles Mosque * | 5 Liverpool Road, Eccles, M30 0WB | no website listed | mosque-000164 |
| Jame'ah Masjid E Noor * | 87 Stamford St, Manchester, Old Trafford, M16 9JE | no website listed | mosque-000150 |
| Khanqah Naqshbandia Mujaddidia | 181a Mauldeth Road, Manchester. . U.K, Burnage, Manchester, M19 1BA | no website listed | mosque-000446 |
| Markaz Darulehsan Manchester | 21-23 Broughton Street, Cheetham Hill, Manchester, M8 8LZ | https://darulehsanuk.co.uk/contact-us/ | mosque-000081 |
| Muslim Youth Foundation * | Clydesdale House, 27 Turner street, Manchester, M4 1DY | no website listed | mosque-000282 |
| NASFAT Manchester Central * | 227 Droylsden Road, Manchester, M40 1NY | http://nasfatmanchester.org.uk/ | mosque-000555 |
| Salaam Community Association and Masjid * | 42 Raby Street, Moss Side, Manchester, M16 7DJ | https://salaamca.org/ | mosque-000118 |
| Selimiye - Selimiye Community Center * | 7 Dolphin Street, Manchester, M12 6BG | no website listed | mosque-000395 |
| UKIM Khizra Mosque * | 425 Cheetham Hill Road, Manchester, M8 0PF | https://www.khizramosque.org/contact-us/ | mosque-000114 |
| University of Manchester Islamic Society - Sackville Prayer Hall * | Sackville Street Building, Basement, Manchester, M1 3BU | https://www.manchesterisoc.com/ | mosque-000380 |

### ME (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Chatham Hill Mosque & Kent Islamic Centre * | 22A Chatham Hill, Kent, Chatham, ME5 7AA | https://chathamhillmosque.co.uk/contact/ | mosque-000262 |
| Kent Muslim Welfare Association * | 114 Canterbury Street, Kent, Gillingham, ME7 5UH | https://kmwa.org.uk/about-us/ | mosque-000003 |
| Maidstonemosque - Community and Islamic Center * | 20 - 28 Mote Road, Maidstone, ME15 6ES | no website listed | mosque-000455 |
| Masjidul Abraar * | 77 Dale St, Chatham, ME4 6QG | no website listed | mosque-000129 |
| Sheppey Islamic Cultural Centre * | 14-16 Minster Road Halfway Sheerness Kent, Halfway Houses, ME12 3JF | no website listed | mosque-000276 |

### MK (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Karam - Mosque * | 19 North St, New Bradwell, Milton Keynes, MK13 0EE | no website listed | mosque-000447 |
| Cranfield University Mosque * | Building 33, Cranfield University, College Road, Bedfordshire, Cranfield, Wharley End, MK43 0AL | https://www.cranfield.ac.uk/study/life-on-campus/worship | mosque-000111 |
| MKCJM | 14-16 Church Street, Wolverton, Milton Keynes, MK12 5JN | no website listed | mosque-000445 |

### ML (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Airdrie Islamic Centre * | 41 Bell St, Airdrie, ML6 0BS | no website listed | mosque-000187 |
| Lanarkshire Mosque * | 3 Clydesdale Street, Bellshill, Motherwell, ML4 2RS | no website listed | mosque-000008 |

### N (10)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Nehar Mosque & Education Centre * | 70 Caledonian Road, Islington, London, N1 9DN | https://alneharmosque.com/ | mosque-000326 |
| Al-Risaalah Mosque & Islington Islamic Centre * | 91-93 Parkhurst Road, London, N7 0LP | https://www.islingtonjamah.co.uk/al-risaalah | mosque-000070 |
| Al-Risaalah Mosque & Islington Islamic Centre * | 91-93 Parkhurst Road, London, N7 0LP | no website listed | mosque-000468 |
| Assunnah Islamic Centre * | 565A High Road, London, N17 6SB | no website listed | mosque-000472 |
| Aziziye Mosque * | 117-119 Stoke Newington Road, London, N16 8BU | https://www.aziziye.org.uk/ | mosque-000181 |
| London Islamic Cultural Society * | and Mosq, 389 Wightman Rd, Harringay, London, Hornsey, N8 0NA | no website listed | mosque-000560 |
| Masjid Ayesha * | 115 Clyde Rd, London, N15 4JZ | no website listed | mosque-000369 |
| Masjid Yusuf * | 440 Hornsey Road, London, N19 4EB | https://www.islingtonjamah.co.uk/masjidyusuf | mosque-000135 |
| MCEC Palmers Green | 30 Oakthorpe Rd, London, N13 5JL | no website listed | mosque-000041 |
| Rumi Mosque * | 337 Fore Street, London, Edmonton, N9 0NU | no website listed | mosque-000333 |

### NE (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Newcastle Central Mosque / Masjid Al-Tawhid * | The White House, Grainger Park Road, Newcastle upon Tyne, NE4 8RQ | https://www.newcastlecentralmosque.com/ | mosque-000379 |
| TCA & Kotku Mosque * | 35 Grainger Park Road, Newcastle upon Tyne, NE4 8SA | https://mecfoundation.org.uk/ | mosque-000100 |
| Whitley Bay Islamic Cultural Centre * | Rinkway, Hillheads Rd, Whitley Bay, NE25 8HR | no website listed | mosque-000280 |

### NG (7)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [DONE] Beeston Muslim Centre * | 4A Evelyn Street, Nottingham, Beeston, NG9 2EU | https://beestonmuslimcentre.co.uk/ | mosque-000031 |
| [VISION-DEFERRED] Karimia Institute * | 512-514 Berridge Road West, Bobbersmill, Nottingham, NG7 5JU | https://www.karimia.com/ | mosque-000030 |
| [VISION-DEFERRED] Karimia Masjid & Institute * | 141-143 Berridge Road, Forest Fields, Nottingham, NG7 6HR | https://www.karimia.com/ | mosque-000049 |
| Masjid Al Khazra * | Queensberry Street, Nottingham, NG6 0DG | no website listed | mosque-000500 |
| Meadows Muslim Centre * | Collygate Road, Nottingham, NG2 2EJ | no website listed | mosque-000252 |
| Newark Islamic Centre * | 83-85 Appleton Gate, Newark, Newark-on-Trent, NG24 1LP | no website listed | mosque-000095 |
| [VISION-DEFERRED] Shah Poran Islamic Centre * | 2-4 Gregory Boulevard, Hyson Green, Nottingham, NG7 6BG | https://www.baituljabbarmosque.org.uk/ | mosque-000007 |

### NN (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Arqam * | 123 Headlands, Kettering, NN15 6AD | no website listed | mosque-000194 |
| Al-Jamatul-Muslimin of Bangladesh | 4-8 St. Georges Street, Semilong, Northampton, NN1 2TR | no website listed | mosque-000056 |
| Baitul Ma’mur Jami' Masjid & Bangladeshi Islamic Centre * | 43 Argyle Street, Northampton, NN5 5LJ | https://bmjm.co.uk/ | mosque-000043 |
| Northampton Central Mosque * | 112 - 116 Abington Avenue, Northampton, NN1 4PD | no website listed | mosque-000215 |
| Northampton Islamic Centre * | 72 Clare Street, Northampton, NN1 3JF | no website listed | mosque-000361 |

### NP (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Noor Masjid * | 23A Harrow Road, Casnewydd, NP19 0BU | https://www.alnoorandjamiamosque.co.uk/about-us | mosque-000436 |
| IQRA Community Centre * | 276 Corporation Road, Casnewydd, NP19 0DZ | https://iqranewport.co.uk | mosque-000441 |
| Jamia Masjid * | 183-186 Commercial Road, Casnewydd, NP20 2PP | https://www.alnoorandjamiamosque.co.uk/about-us | mosque-000572 |
| Newport Central Jam'e Masjid * | 63 Stow Hill, Gwent, Casnewydd, NP20 4DX | no website listed | mosque-000166 |
| Shah Poran Bangladeshi Jam'e Mosque * | 51-52 Hereford Street, Gwent, Casnewydd, NP19 8DT | no website listed | mosque-000415 |

### NR (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Hethersett Masjid * | Henstead Road, Norwich, Hethersett, NR9 3JH | https://hethersettmasjid.org.uk/contact/ | mosque-000582 |

### NW (8)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Afghan Islamic Cultural Centre * | 210-214 Church Road, London, NW10 9NP | http://www.afghanicc.com/about.html | mosque-000137 |
| Al-Rahman Mosque and Education Centre * | Godwin Court, Crowndale Road, London, NW1 1NW | no website listed | mosque-000329 |
| Harlesden Ummah | 21 Craven Park Road, London, NW10 8SE | https://harlesdenummah.org/ | mosque-000113 |
| Hendon Mosque & Islamic Centre * | Brent View Road \| Hendon \|, Hendon, NW9 7EL | no website listed | mosque-000596 |
| Hillside Islamic Cultural Centre * | 175 Hillside, Stonebridge, London, NW10 8LL | no website listed | mosque-000097 |
| Kentish Town Baitul Aman Mosque * | 156-158 Weedington Road, London, NW5 4NU | no website listed | mosque-000440 |
| Somers Town Mosque * | 68 Churchway, London, NW1 1LT | no website listed | mosque-000318 |
| The Mosque & Islamic Centre of Brent * | 33A Howard Road, Cricklewood, London, NW2 6DS | no website listed | mosque-000241 |

### OL (12)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Madina Jamia * | Al-Madina Jamia Masjid & Islamic Centre 230-240 Waterloo Street, Glodwick, Oldham, OL4 1ES | no website listed | mosque-000208 |
| Ashton Central Mosque * | Hillgate Street, Ashton-under-Lyne, OL6 9JA | no website listed | mosque-000519 |
| Ashton Jame Mosque & Islamic Centre * | 243 Cavendish Street, Ashton-under-Lyne, OL6 7DS | no website listed | mosque-000027 |
| Azmet E Islam * | 79-85 Retford Street, Oldham, OL4 1BL | https://masjidbox.com/prayer-times/noor-e-islam-masjid | mosque-000352 |
| Bilal Jamia Masjid and Madressa * | 19-23 Ronald Street, Clarkfield, Lancashire, Oldham, OL4 1NE | https://bilaljamiamasjid.com/ | mosque-000578 |
| Central Masjid Rochdale * | Mere Street, Lancashire, Rochdale, OL11 1HJ | no website listed | mosque-000542 |
| Masjid Al Furqan * | 17 Philip Street Deeplish, Rochdale Lancashire, Rochdale, OL11 1NY | no website listed | mosque-000481 |
| [DONE] Masjid-E-Hamzah * | Katherine Street, Ashton-under-Lyne, OL7 0AN | https://masjidehamzah.co.uk/about-us/ | mosque-000524 |
| Masjid-Ul-Aqsa * | 135 Windsor Road, Oldham, OL8 1RG | https://www.masjidulaqsa.org.uk/ | mosque-000458 |
| Nagina Jamia Masjid * | 74 Werneth Hall Rd, Oldham, OL8 4BB | no website listed | mosque-000425 |
| Neeli Mosque & Islamic Centre (UKIM) * | 25-27 Hare Street, Rochdale, OL11 1JL | no website listed | mosque-000454 |
| Noor E Islam * | 44-46 Manchester Road, Oldham, OL9 7AP | https://www.ukimoldham.org.uk/ | mosque-000609 |

### OX (8)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Abingdon Muslims * | Radley Village Hall, Gooseacre, Radley, OX14 3BL | https://www.abingdonmuslims.org/ | mosque-000591 |
| Banbury Madni Masjid * | Merton Street, Oxfordshire, Banbury, OX16 4RX | no website listed | mosque-000601 |
| Banbury Sheikh Bin Baaz Masjid * | 55 Park Road, Oxfordshire, Banbury, OX16 0DH | no website listed | mosque-000098 |
| Central Oxford Mosque Society * | Manzil Way, Oxford, OX4 1DJ | no website listed | mosque-000331 |
| Madina Masjid Oxford * | 2 Stanley Rd, Oxford, OX4 1QZ | no website listed | mosque-000304 |
| Muslim Educational Centre of Oxford - Jumu’ah * | Second Floor, Chester House, 21-27 George Street, Oxford, OX1 2AY | http://www.meco.org.uk | mosque-000142 |
| Oxford University Islamic Society * | Robert Hooke Building, Parks Rd, Oxford, OX1 3PP | no website listed | mosque-000598 |
| SOMA Didcot - Jumu’ah | Fleet Meadow Community Hall, Sandringham Road, Didcot, OX11 8TP | https://somadidcot.org/ | mosque-000126 |

### PA (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Darul-Quran Islamic Center * | 218 Paisley Road, Renfrew, PA4 8AA | no website listed | mosque-000517 |

### PE (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Huntingdon Jamia Mosque * | 31 Coneygear Road, Huntingdon, PE29 1QN | no website listed | mosque-000561 |
| Masjid Al Noor * | 28 Trinity Street Boston Lincolnshire, Boston, PE21 8RJ | no website listed | mosque-000541 |
| Masjid Darassalaam (Alma Road) * | 80-82 Alma Road, Peterborough, PE1 3JB | https://www.darassalaam.org.uk | mosque-000192 |
| Masjid Ghousia * | 406 Gladstone Street, Peterborough, PE1 2BY | no website listed | mosque-000116 |

### PL (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Plymouth Islamic Education Trust (PIETY) * | 19 Greenbank Avenue, Plymouth, PL4 8PS | http://piety.org.uk/visiting/ | mosque-000226 |

### PO (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Portsmouth Central Masjid * | 300 Somers Road North, Fratton, Portsmouth, PO1 1PL | http://portsmouthcentralmasjid.com/ | mosque-000033 |
| Portsmouth Jami Mosque - Islamic Centre * | 111 Victoria Road North, Southsea, Portsmouth, PO5 1PS | no website listed | mosque-000143 |

### PR (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [DONE] Al Huda Preston * | 14 Avenham Road, Avenham, Preston, PR1 3TH | https://www.al-huda.org.uk/ | mosque-000521 |
| [DONE] Al-Ansaar Welfare & Education * | 140-142 Garstang Road, Fulwood, Preston, PR2 8NA | https://alansaar.org.uk/contact-us/ | mosque-000158 |
| [DONE] Masjid E Aqsa * | 95-101 Fishwick Parade, Preston, PR1 4XR | https://www.masjid-e-aqsa.net/homepage | mosque-000298 |
| [VISION-DEFERRED] Masjid-e-Saliheen * | Grafton Street, Preston, PR1 8JH | https://masjidsaliheen.com/about-us/history | mosque-000476 |
| [VISION-DEFERRED] UCLan Islamic Society - Friday Prayers * | Sir Tom Finney Sports Centre, Marsh Lane, Lancashire, Preston, PR1 2HE | https://www.uclansu.co.uk/groups/islamic-society/ | mosque-000165 |

### RG (8)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Aisha Masjid & Islamic Centre * | London Road, Berkshire, Earley, Reading, RG6 1AH | no website listed | mosque-000429 |
| Bracknell Masjid * | Unit C, Waterside Park, Bracknell, RG12 1RB | https://www.bracknell-ics.org.uk/contact/ | mosque-000489 |
| Central Jamme Masjid, Reading * | 18A Waylen Street, Berkshire, Reading, RG1 7UR | https://www.readingmosque.com/about/ | mosque-000442 |
| Jamme Masjid Reading * | 46 Alexandra Road, Berkshire, Reading, RG1 5PF | no website listed | mosque-000307 |
| Masjid Albirr * | 35-37 Sarum Hill, Basingstoke, RG21 8SS | https://www.albirr.com/ | mosque-000275 |
| Newbury Jamme Masjid * | 33 Pound Street, Newbury, RG14 6AE | https://www.newburyjammemasjid.org.uk/about/ | mosque-000058 |
| Reading Islamic Centre - South Street Centre * | 50-52 South Street, Reading, RG1 4RA | https://www.ricuk.org | mosque-000533 |
| Whitley Muslim Education Trust - Friday Prayer Centre * | Scout Hut, 500 Basingstoke Road, Reading, RG2 0QN | https://wmet.co.uk/ | mosque-000128 |

### RH (6)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Crawley Masjid and Islamic Center * | 157 London Rd, Crawley, RH10 9TA | no website listed | mosque-000480 |
| [DONE] Crawley Mosque - Quwat-Ul-Islam Masjed * | Broadwood Rise, Crawley, RH11 9SE | https://www.crawleymosque.com/ | mosque-000212 |
| Madina Masjid Horsham * | 2 Park Terrace E, Horsham, RH13 5SN | no website listed | mosque-000421 |
| Masjid Al Yaqeen * | 28 Warwick Road, Surrey, Redhill, RH1 1BU | https://masjidalyaqeen.co.uk/ | mosque-000012 |
| Mid Sussex Islamic Centre & Masjid * | 19 Wivelsfield Rd, Haywards Heath, RH16 4EF | no website listed | mosque-000210 |
| Redhill Jamia Mosque Al Mustafa * | 30 Earlswood Road Redhill Surrey, Redhill, RH1 6HW | no website listed | mosque-000463 |

### RM (7)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Collier Row Mosque * | 148a Chase Cross Rd Collier Row Romford, London, RM5 3UU | no website listed | mosque-000099 |
| Essex Cultural & Youth Society - Jumu’ah Salaah * | MYPLACE Building, Dagnam Park Drive, Romford, London, RM3 9EN | https://www.ecys.org.uk/jummah-salah/ | mosque-000320 |
| Grays Park Masjid * | Parkway Centre, Park Road, Essex, Grays, RM17 6RB | no website listed | mosque-000239 |
| Havering Islamic Cultural Centre * | 91 Waterloo Road Romford Essex, Romford, RM7 0AA | no website listed | mosque-000527 |
| RMC | Royals Youth Centre, Viking Way, Rainham, London, RM13 9YG | no website listed | mosque-000316 |
| Romford Mosque * | 29 Lessington Avenue, Romford, RM7 9EB | no website listed | mosque-000218 |
| Tilbury Mosque * | 159 St. Chads Road, Essex, Tilbury, RM18 8LJ | no website listed | mosque-000091 |

### S (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Baitul Mukarram Jame Masjid * | 358 London Rd, Highfield, Sheffield, S2 4NB | no website listed | mosque-000301 |
| Gulzar-e-Habib Mosque & Education Centre * | 46-48 Ribston Road, Darnall, Sheffield, S9 3AY | http://www.janathimessage.co.uk/contact.html | mosque-000090 |
| Makki Mosque Sheffield * | Plantation Road, Sheffield, S8 9TH | no website listed | mosque-000266 |
| Muslim Welfare Association of Chesterfield and North Derbyshire * | 10A Marsden Street, Chesterfield, S40 1JY | https://www.muslimwelfarechesterfield.com/contact-us/ | mosque-000554 |

### SA (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Neath Islamic Cultural Centre * | St Annes Terrace, Neath, Tonna, SA11 3JB | no website listed | mosque-000535 |
| Port Talbot Mosque * | Oakwood Lane, Port Talbot, SA13 1DF | no website listed | mosque-000603 |
| Sketty Mosque and Community Centre * | Sketty Park Road, Sketty, Abertawe, SA2 9AS | https://www.skettymosque.org/ | mosque-000110 |
| Swansea Mosque * | 159A St Helens Road, Abertawe, SA1 4DG | https://www.swanseamosque.org/contact | mosque-000145 |
| West Wales Islamic Cultural Association & Masjid * | West Wales Islamic Cultural Association, 131 Priory Street, Carmarthen, Caerfyrddin, SA31 1LR | no website listed | mosque-000217 |

### SE (13)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Baitul Aziz Masjid * | 1 Dickens Square (off Harper Road), Southwark, SE1 4JL | no website listed | mosque-000606 |
| BWA Muslim Cultural Centre and Mosque * | 10A Clifton Rise, New Cross, London, SE14 6JP | https://bwamcc.co.uk | mosque-000586 |
| Camberwell Islamic Centre * | 188 Camberwell Road, London, Camberwell, SE5 0ED | https://camberwellislamiccentre.co.uk/contact/ | mosque-000209 |
| Greenwich Islamic Centre * | 131 Plumstead Rd, London, SE18 7DW | no website listed | mosque-000537 |
| Lambeth Masjid - Progressive Community Centre * | 194 Coldharbour Lane, Loughborough Junction, London, SE5 9PA | no website listed | mosque-000457 |
| Lewisham Islamic Centre * | 363-365 Lewisham High Street London, Lewisham, SE13 6NZ | no website listed | mosque-000569 |
| NASFAT UK | 33 Pages Walk, London, Bermondsey, SE1 4SB | no website listed | mosque-000064 |
| Old Kent Road Mosque & Islamic Cultural Centre * | 365 Old Kent Road, London, SE1 5JH | https://www.manuk.org/ | mosque-000022 |
| Penge Islamic Centre (Penge Mosque) * | 157A High Street, London, Penge, SE20 7DS | no website listed | mosque-000050 |
| South Norwood Islamic Community Centre (SNICC) * | 3 Clifford Road, South Norwood, London, SE25 5JJ | no website listed | mosque-000130 |
| SRICC Baitul Rahman Masjid * | Unit 1, 82-96 Old Kent Road, London, SE1 4NX | https://somalirelief.org.uk/ | mosque-000448 |
| The Prayer Space * | 2nd Floor, Aperture Building, 42 Chandlers Avenue, Greenwich Peninsula, London, SE10 0GE | http://www.prayerspace.org.uk | mosque-000600 |
| West Norwood Mosque * | 58-60 Norwood High St, Norwood, London, SE27 9NW | no website listed | mosque-000312 |

### SG (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Stevenage Muslim Community Centre * | The Sishes, Vardon Road, Stevenage, SG1 5PZ | https://www.smcc786.org | mosque-000159 |

### SK (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Hyde Jamia Mosque & Islamic Centre * | 21 Jackson Street, Hyde, SK14 1BX | no website listed | mosque-000573 |

### SL (7)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Al-Hira Educational & Cultural Centre * | 68-72 Ragstone Road, Slough, SL1 2PX | https://alhiraslough.co.uk/contact/ | mosque-000491 |
| Al-Tawheed Masjid (TIECM) * | 22 Cookham Road, Maidenhead, SL6 8AJ | https://tiecm.org/ | mosque-000152 |
| JMIC Slough | Jamia Masjid & Islamic Centre, 83 Stoke Poges Lane, Slough, SL1 3NY | no website listed | mosque-000394 |
| MASJID ILYAS * | Whitby Rd, Slough, SL1 3DW | no website listed | mosque-000123 |
| [VISION-DEFERRED] Montem Lane Mosque * | 35 Montem Lane, Berkshire, Slough, SL1 2QW | https://www.sloughislamictrust.org.uk/Contact/ | mosque-000382 |
| The Slough Islamic Trust - Jamia Ghousia Masjid & Islamic Centre * | 78 Diamond Rd, Slough, SL1 1RX | no website listed | mosque-000365 |
| Windsor Muslim Association * | Clewer Community Centre, Parsonage Lane, Berkshire, Windsor, SL4 5EW | no website listed | mosque-000292 |

### SM (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Morden Islamic Community Centre * | 116 London Road, Surrey, Morden, SM4 5AX | https://www.miconline.co.uk/contact-us | mosque-000039 |
| Muslim Cultural & Welfare Association of Sutton (MCWAS) * | Wentworth Hall, 80 Ruskin Road, Surrey, Carshalton, SM5 3DH | no website listed | mosque-000141 |
| Sutton Central Masjid * | 25 Carshalton Road, Surrey, Sutton, SM1 4LF | no website listed | mosque-000557 |

### SN (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Habib Islamic Centre * | 📍 88 Chapel Street, Swindon, SN2 8DA | no website listed | mosque-000037 |
| SHAJALAL CENTRAL MOSQUE * | 136-139 Manchester Rd, Swindon, SN1 2AF | no website listed | mosque-000185 |
| Swindon Jami’ah Masjid * | 124-125 Broad Street, Wiltshire, Swindon, SN1 2DR | https://www.swindonmasjid.com/ | mosque-000616 |

### SO (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| [VISION-DEFERRED] Al-Hayat Centre * | Duke Road, Southampton, SO14 0SQ | https://alhayatcentre.co.uk/contact/ | mosque-000388 |
| Medina Mosque Southampton * | Southampton Medina Mosque Trust Ltd Compton Walk Off St Mary’s Road, Southampton, SO14 0BH | no website listed | mosque-000424 |
| Shahjalal Mosque & Islamic Centre * | 121 Saint Mary's Rd, Southampton, SO14 0BL | no website listed | mosque-000204 |
| Winchester Muslim Cultural Association * | Winchester Islamic Centre, 55 Hyde Street, Winchester, SO23 7DY | no website listed | mosque-000482 |

### SP (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Salisbury Central Masjid * | 27 Wilton Road, Salisbury, SP2 7ED | no website listed | mosque-000236 |

### SS (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Southend Mosque * | 191-197 West Road, Westcliff-on-Sea, Southend-on-Sea, SS0 9DH | no website listed | mosque-000115 |
| Stanford Jamme Masjid * | Methodist Church High Street, Stanford-le-Hope, SS17 0EY | no website listed | mosque-000086 |

### ST (6)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| City Central Mosque Stoke-on-Trent * | City Central Mosque Regent Road, Staffordshire, Hanley, Stoke-on-Trent, ST1 3AY | no website listed | mosque-000348 |
| [VISION-DEFERRED] Makki Masjid * | 59-61 Beresford Street, Stoke-on-Trent, ST4 2EX | https://makkimasjidstoke.co.uk/ | mosque-000496 |
| [VISION-DEFERRED] Markaz Al-Huda | Former Queensbury Youth Centre, Furnace Road, Normacot, Stoke-on-Trent, ST3 1QZ | https://attawheedfoundation.co.uk/ | mosque-000124 |
| [VISION-DEFERRED] Markaz As-Sunnah * | Ladywell Road, Tunstall, Stoke-on-Trent, ST6 5DE | https://attawheedfoundation.co.uk/markaz-as-sunnah/ | mosque-000355 |
| [VISION-DEFERRED] Markaz At-Tawheed | Rectory Road, Shelton, Stoke-on-Trent, ST1 4PW | https://attawheedfoundation.co.uk/contact-us/ | mosque-000313 |
| Stafford Muslim Prayer Hall * | 17- 19 Greyfriars’ Place, Stafford, ST16 2SD | no website listed | mosque-000202 |

### SW (11)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al Muzzammil Mosque * | 8 Gatton Road, Tooting, London, SW17 0EX | http://gattonmosque.co.uk/ | mosque-000205 |
| Al Noor | 2nd Floor, 1517A, London Road, Norbury, London, SW16 4AE | no website listed | mosque-000051 |
| Al-Nagashi Masjid * | 283-291 Wandsworth Road, Vauxhall, London, SW8 2ND | no website listed | mosque-000229 |
| Balham Masjid & Tooting Islamic Centre * | 47A Balham High Road, London, SW12 9AW | https://www.balhammosque.org/ | mosque-000087 |
| Bismillah Centre * | 1370C London Road, Norbury, London, SW16 4DE | https://bismillahcentre.com/?section=about | mosque-000418 |
| Chelsea Muslim Community Hub * | 14 Blantyre Street, World’s End Estate, London, Chelsea, SW10 0DS | no website listed | mosque-000485 |
| Islamic Culture & Education Centre, Battersea * | 73/75 Falcon Road, Battersea, London, SW11 2PF | no website listed | mosque-000413 |
| Norbury Islamic Academy * | 1595-1597 London Road, Norbury, London, SW16 4AA | https://www.norbury.org/?section=contactus | mosque-000378 |
| Norbury Muslim Centre * | 1116 London Road Norbury, London, SW16 4DT | no website listed | mosque-000199 |
| North Brixton Islamic Cultural Centre * | 180/182A Brixton Road, London, SW9 6AT | no website listed | mosque-000005 |
| Wimbledon Mosque * | 262-270 Dursnford Road London, Wimbledon, SW19 8DS | no website listed | mosque-000444 |

### TF (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Shropshire Islamic Foundation * | 88-90 King St, Wellington, Telford, TF1 1NZ | no website listed | mosque-000370 |
| Shropshire Islamic Foundation * | 88-90 King St, Wellington, Telford, TF1 1NZ | no website listed | mosque-000507 |

### TN (3)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Ashford Muslim Association * | 79 Torrington Road, Ashford, TN23 7TG | https://ashfordmosque.org/ | mosque-000401 |
| Hastings Mosque * | 12 Mercatoria, Saint Leonards-on-sea, Hastings, TN38 0EB | no website listed | mosque-000271 |
| Masjid Al-Noor * | 99 Camden Rd, Royal Tunbridge Wells, TN1 2QR | no website listed | mosque-000566 |

### TR (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Cornwall Islamic Community Centre * | Quenchwell Road, Carnon Downs, TR3 6LN | no website listed | mosque-000464 |

### TS (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Abu Bakr Mosque and Cultural Centre * | 12 Cannon Park Way, Middlesbrough, TS1 5JU | no website listed | mosque-000291 |
| Middlesbrough Central Mosque * | 30 Southfield Road, Middlesbr’, Middlesbrough, TS1 3EX | no website listed | mosque-000568 |

### TW (4)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Ashford & Staines Community Centre * | 774 London Road, Stanwell, Ashford, London, TW14 8FP | https://ascc.uk.com/contact-us/ | mosque-000105 |
| Feltham Hira Centre * | 102 Hounslow Road, Feltham, TW14 0AX | https://www.hira.org.uk/ | mosque-000590 |
| Hounslow Muslim Centre * | 4-6 Hanworth Road, Hounslow, London, TW3 1UA | no website listed | mosque-000258 |
| Madina Islamic Mission * | 86 Hibernia Rd, Hounslow, London, TW3 3RN | no website listed | mosque-000048 |

### UB (7)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Abdullah Masjid - Hayes Welfare Association * | Hayes Welfare Association, Waltham Avenue, Middlesex, Hayes, UB3 1TF | no website listed | mosque-000311 |
| Abubakr Mosque Southall * | 165 - 169 The Broadway Southall Middlesex, Southall, UB1 1LR | no website listed | mosque-000522 |
| Al Falah Centre * | The Forge, St Stephens Road, West Drayton, Yiewsley, UB7 7RL | no website listed | mosque-000245 |
| Al Madinah Masjid Hayes * | Unit 1, Johnson Industrial Estate, Silverdale Rd, Hayes, UB3 3BA | no website listed | mosque-000151 |
| Hayes Muslim Centre * | 3 Pump Lane, Hayes, UB3 3NB | no website listed | mosque-000351 |
| Jamia Masjid West Drayton * | 1 Colham Mill Rd, Yiewsley, West Drayton, UB7 7AD | no website listed | mosque-000138 |
| Uxbridge Masjid * | 4 - 5 Cowley Mill Road, United Kingdon, Uxbridge, London, UB8 2QB | no website listed | mosque-000420 |

### W (8)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Acton Mosque * | 2-5 Oldham Terrace, London, Acton, W3 6LS | no website listed | mosque-000511 |
| An Noor Cultural & Community Centre * | 58-70 Church Road, London, Acton, W3 8PP | https://www.annoorcentre.com | mosque-000539 |
| Hammersmith Islamic Association * | 30-32 Bradmore Park Road, London, Hammersmith, W6 0DT | https://hammersmithmasjid.org/ | mosque-000563 |
| Mayfair Islamic Centre * | 19 Hertford St, Mayfair London, Westminster, W1J 7RU | no website listed | mosque-000289 |
| Muslim World League London Office * | 46 Goodge Street, London, W1T 4LU | https://www.mwllo.org.uk/ | mosque-000384 |
| Shepherds Bush Mosque * | 300-302 Uxbridge Road, Shepherds Bush, London, W12 7LJ | https://www.shepherdsbushmosque.org/ | mosque-000610 |
| Umar Islamic Centre * | Friendship Club, Oxford Rd N, Chiswick, London, W4 4DN | no website listed | mosque-000216 |
| WLIC | UKIM West London Islamic Centre, Singapore Road, London, W13 0SQ | no website listed | mosque-000156 |

### WC (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| King's Cross Mosque & Islamic Cultural Centre * | Sandfield Basement, Cromer Street, London, WC1H 8DU | https://www.kingscrossmosque.org/contact | mosque-000270 |

### WD (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Elstree & Borehamwood Islamic Community * | Maxwell Park, Maxwell Road, Borehamwood, WD6 1JJ | https://ebic.org.uk/contact-us/ | mosque-000263 |

### WF (5)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Jamia Masjid Swafia * | Park Hill Lane, Wakefield, WF1 4NJ | https://www.swafia.org.uk/ | mosque-000428 |
| Markazi Jamia Mosque Wakefield * | 12 Grange Street, Wakefield West Yorkshire, Wakefield, WF2 8TF | no website listed | mosque-000063 |
| Masjid Noor & Education Centre * | Lees Hall Road, Dewsbury, WF12 9HF | http://www.masjid-noor.org/ | mosque-000253 |
| Masjid Quba - Healey Islamic Trust * | Masjid Quba, Unit 8 Healey Mills, Healey Lane, Batley, WF17 7SH | no website listed | mosque-000233 |
| Masjid Zakariya * | 167 Agbrigg Road, Wakefield, WF1 5BN | https://masjidzakariya.co.uk/contact/ | mosque-000528 |

### WN (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Masjid al-Furqān Leigh * | 50 Vernon Street, Leigh, WN7 1BH | no website listed | mosque-000269 |
| Masjid Tooba * | 240 Warrington Road, Ince, Ince-in-Makerfield, WN3 4NH | no website listed | mosque-000305 |

### WR (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Al-Madina Jami Masjid Worcester * | Tolladine Road, Worcester, WR4 9PS | https://almadinamasjid.uk/ | mosque-000082 |
| Jalalabad Association * | Unit 7, Three Springs Trading Estate, Vincent Road, Worcester, WR5 1BW | no website listed | mosque-000552 |

### WS (2)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Jalalia Sunni Jami Masjid & Islamic Education Centre * | 150 Bath St, Walsall, WS1 3BX | no website listed | mosque-000286 |
| Masjid Al-Aqsa * | Phoenix Business Park, 150 Stafford Street, Walsall, WS2 8EA | https://masjid-alaqsa-walsall.co.uk/ | mosque-000317 |

### WV (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Jamia Masjid Aqsa, Wolverhampton * | 197 Waterloo Rd, Wolverhampton, WV1 4RA | no website listed | mosque-000025 |

### YO (1)

| Mosque | Address | Website | Sirat ID |
|---|---|---|---|
| Scarborough Islamic Centre * | Unit 62, Roscoe Street, Scarborough, YO12 7BY | https://scarbislam.com/ | mosque-000398 |

*\* = name also appears in `uk-mosque-expansion-shortlist.md` (may already be researched).
