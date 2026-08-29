# Taste
- Work in the existing project directory (`/Users/mikhail/Documents/CURSOR-CODES/Deployed/Sheffield-Masjids`) instead of cloning or re-creating the repo. Confidence: 0.9
- User parallelizes extraction work by town; when they say they're already handling a town (e.g., "im already doing cambridge right now. do another one"), don't duplicate their effort — pick a different town/area to work on. Confidence: 0.6
- After data changes, seed both dev and prod (`npx tsx scripts/seed-convex.ts --changed` and `--changed --prod`). Confidence: 0.9
- Commit and push when asked; "commit and push everything" means include all project changes, not just the current task's files. Confidence: 0.9
- Extract prayer times from HTTP sources (JSON/REST, CSV, HTML, plugin APIs) autonomously, but leave PDF/image extraction to the user and report which mosques need it (explicitly reaffirmed: "if can be http extracted do it, if pdf let me know"). Confidence: 1.0
- Treat WAF/Cloudflare-blocked endpoints as worth retrying with browser-like headers (User-Agent, Accept, Referer, X-Requested-With, cookies) before declaring a source unusable — a 406 on plain curl was bypassed that way (bects.org DPT). Confidence: 0.6
- Use the `extract-mosque-prayer-times` skill when pulling prayer times from mosque websites. Confidence: 0.8
- Verify existing prayer-time data against the mosque's live source (website, REST endpoint, or local timetable app like Awqat.app) before trusting or fixing it — including when the user reports timings were updated or wrong (user has twice explicitly said to "check the website" rather than take the report at face value, e.g., "iqamah for fajr and isha is wrong on our end. check the website"). Confidence: 0.95
- Ask before seeding — the user wants to control when extracted data gets seeded (said "don't seed yet" while data was still being gathered, then explicitly green-lit with "seed them" once extraction and commit were complete). Confidence: 0.9
- Does not run npm/npx commands (seeding scripts, builds, etc.) unless explicitly asked; project rule is to present the commands and ask for the go-ahead first. Confidence: 0.8
- Keep published timings as-is even when they look wrong (e.g., DST anomalies); never compute, adjust, or fill in missing values. Confidence: 0.8
- Set `isHidden = false` for mosques that have current-month data available. Confidence: 0.8
- For masjids that publish via Facebook, source their prayer times from Facebook. Confidence: 0.8
- Reject prayer-time sources that rely on astronomical calculation APIs (e.g., api.aladhan.com), which are banned for this project — no matter how convenient the source. Confidence: 0.7
- For months where Friday jumuah time changes mid-month (e.g., summer↔winter transition), keep per-day values as per-entry `jummah` in iqamah_times (with `jummah_iqamah` holding the month's first value) rather than forcing a single monthly jummah time. Confidence: 0.6
- Monthly data files use the shape `{month, prayer_times: [{date, fajr, shurooq, dhuhr, asr, maghrib, isha}], iqamah_times: [{date_range, ...}], jummah_iqamah}` with 24h `HH:MM` times. Confidence: 0.8
- In the UAE all mosques share identical timings, so model UAE data per city (e.g., dubai-mosques) without per-mosque timing fields. Confidence: 0.8
- Group mosques by logical area (e.g., Heckmondwike masjids under Batley) rather than strictly by city. Confidence: 0.6
Require full current-year coverage (all 12 monthly files); drop partial-month, stale-year (e.g., previous year's tables), or corrupted feeds rather than ship incomplete or bad data (e.g., dropped Masjid Umar Leicester whose DPT feed only served Jan–Mar). Confidence: 0.8
- A mosque with no monthly file for the current month renders as a bogus 1am fallback; the fix is adding the missing monthly file from the website's official timetable, not patching the fallback. Confidence: 0.7
- When a data bug is found in one mosque's monthly data, proactively audit the entire dataset for the same problem class (e.g., missing/partial month files across all mosques) and report all affected mosques, prioritizing those visible to users, rather than fixing only the reported instance. Confidence: 0.8
- Prefers file-based tools (read_file / edit_file / grep) over shell scripts for inspecting project files. Confidence: 0.6
- Aims for at least 5 masjids per major city, prioritizing top-50 Muslim-populated areas and zero-coverage gaps. Confidence: 0.6
- When a required field is missing, backfill it only from a value the source itself publishes elsewhere (e.g., set jummah_iqamah from the Friday dhuhr iqamah when the feed's jumua is null); if the source doesn't publish it at all, drop the mosque rather than invent data (e.g., dropped Jamia Masjid Hanfia for publishing no shurooq). Confidence: 0.7
- Sanity-check extracted data before committing: confirm 365-day coverage per mosque, plausible time ranges (e.g., winter fajr ~06:30 in Leeds), and schema validation on all new files. Confidence: 0.6
rt the day-by-day comparison, and ask which specific day/month changed rather than guessing or making speculative edits. Confidence: 0.6
- When the user reports wrong times and the website/files check out, also verify the app's own API layer — query the live Convex endpoints (both dev and prod, e.g. `prayerTimes:getMonthly`) and compare against the files and website before concluding (user said "check the api" after the website was confirmed matching). Confidence: 0.8
