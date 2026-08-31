import fs from 'fs';
import path from 'path';

const FRED_API_KEY = process.env.FRED_API_KEY;
const SERIES_IDS = {
  sp500: 'SP500',
  yield_curve: 'T10Y2Y',
  credit_spread: 'BAMLC0A0CM',
  bbb_spread: 'BAMLC0A4CBBB',
  sahm_rule: 'SAHMREALTIME',
  ted_spread: 'STLFSI4',
  fed_liquidity: 'WALCL',
  fed_funds: 'DFF'
};

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
