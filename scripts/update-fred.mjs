// Version: 2.0.1 | Last Modified: 2026-11-23 09:38 HKT
/*
  File: scripts/update-fred.mjs
  Description: Node.js backend fetcher run by GitHub Actions. Imports SERIES_IDS
               directly from js/config.js, pulls 28 months of FRED observations
               (ensuring full 1Y YoY lookbacks on a 2Y chart), and writes data/fred_cache.json.
  Change Log:
    - 2.0.1 (2026-11-23 09:38 HKT): Version sync; pairs with package.json ("type": "module")
      so Node 20 cleanly imports ../js/config.js in a fresh repo.
    - 2.0.0 (2026-11-23 08:41 HKT): Expanded lookback to 28 months and added _meta.updatedAt.
    - 1.0.0 (2026-08-01 00:00 HKT): Initial FRED cache updater.
*/

import fs from 'fs';
import path from 'path';
import { SERIES_IDS } from '../js/config.js';

const FRED_API_KEY = process.env.FRED_API_KEY;
const LOOKBACK_MONTHS = 28;
const REQUEST_DELAY_MS = 120;

async function fetchSeries(seriesId) {
  const d = new Date();
  d.setMonth(d.getMonth() - LOOKBACK_MONTHS);
  const startDate = d.toISOString().split('T')[0];

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.observations || [];
  } catch (err) {
    console.error(`Failed to fetch ${seriesId}:`, err.message);
    return [];
  }
}

async function main() {
  if (!FRED_API_KEY) {
    console.error('Missing FRED_API_KEY environment variable.');
    process.exit(1);
  }

  const cache = {
    _meta: {
      version: '2.0.1',
      updatedAt: new Date().toISOString()
    }
  };

  for (const [key, seriesId] of Object.entries(SERIES_IDS)) {
    console.log(`Fetching ${key} (${seriesId})...`);
    cache[key] = await fetchSeries(seriesId);
    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  const outputDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'fred_cache.json'),
    JSON.stringify(cache, null, 2)
  );

  console.log('Successfully updated data/fred_cache.json');
}

main();
