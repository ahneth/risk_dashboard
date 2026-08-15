// js/fred-api.js
import { FRED_CONFIG } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  if (!FRED_CONFIG.API_KEY) {
    throw new Error(`[FRED API] API key missing for "${key}"`);
  }

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 24);
  const startDateStr = startDate.toISOString().split('T')[0];

  const rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json&observation_start=${startDateStr}&frequency=m&aggregation_method=eop`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`[FRED API] HTTP ${response.status} fetching "${key}"`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.observations)) {
    throw new Error(`[FRED API] Invalid schema received for "${key}"`);
  }

  const cleanHistory = parseObservations(data.observations);

  if (cleanHistory.length === 0) {
    throw new Error(`[FRED API] Zero valid numeric data points for "${key}"`);
  }

  return cleanHistory;
}

function parseObservations(observations) {
  return observations
    .filter(obs => obs.value && obs.value !== '.')
    .map(obs => ({
      date: obs.date.substring(0, 7),
      value: parseFloat(obs.value)
    }));
}
