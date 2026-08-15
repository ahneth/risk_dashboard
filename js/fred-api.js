// js/fred-api.js
import { FRED_CONFIG } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  if (!FRED_CONFIG.API_KEY) {
    throw new Error(`[FRED API] API key missing for "${key}"`);
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 24);
  const startDateStr = startDate.toISOString().split('T')[0];

  // Primary end-of-period query
  let rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json&observation_start=${startDateStr}&frequency=m&aggregation_method=eop`;
  let proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

  let response = await fetch(proxyUrl);

  // Fallback to unaggregated raw series if end-of-period is rejected
  if (!response.ok) {
    rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json&observation_start=${startDateStr}`;
    proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;
    response = await fetch(proxyUrl);
  }

  if (!response.ok) {
    throw new Error(`[FRED API] HTTP ${response.status} fetching "${key}" (${seriesId})`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.observations)) {
    throw new Error(`[FRED API] Invalid observation structure for "${key}"`);
  }

  const cleanHistory = parseObservations(data.observations);

  if (cleanHistory.length === 0) {
    throw new Error(`[FRED API] Zero valid numeric data points for "${key}"`);
  }

  return cleanHistory;
}

function parseObservations(observations) {
  const monthlyMap = new Map();

  for (const obs of observations) {
    if (obs.value && obs.value !== '.') {
      const monthKey = obs.date.substring(0, 7);
      monthlyMap.set(monthKey, parseFloat(obs.value));
    }
  }

  return Array.from(monthlyMap.entries()).map(([date, value]) => ({ date, value }));
}
