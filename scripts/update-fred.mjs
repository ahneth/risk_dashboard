import fs from 'fs';
import path from 'path';
// Import the single source of truth from your frontend config
import { SERIES_IDS } from '../js/config.js'; 

const FRED_API_KEY = process.env.FRED_API_KEY;

async function fetchSeries(seriesId) {
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
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

  const cache = {};
  for (const [key, seriesId] of Object.entries(SERIES_IDS)) {
    console.log(`Fetching ${key} (${seriesId})...`);
    cache[key] = await fetchSeries(seriesId);
    // 100ms delay to respect FRED API guidelines
    await new Promise(r => setTimeout(r, 100));
  }

  // process.cwd() resolves to the root directory because your 
  // GitHub Actions workflow runs: `node scripts/update-fred.mjs`
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
