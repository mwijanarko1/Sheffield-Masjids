#!/usr/bin/env node
/**
 * Extracts Loughborough Mosque (LMICA) 2026 prayer times from the official PDF timetable.
 *
 * Source: https://lboromasjid.co.uk/wp-content/uploads/2025/12/Loughborough-mosque-2026-prayer-time-table_comp.pdf
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
execSync(`python3 "${path.join(scriptDir, 'fetch-loughborough-mosque-timetable.py')}"`, {
  stdio: 'inherit',
});
