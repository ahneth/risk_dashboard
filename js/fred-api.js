// js/fred-api.js
import { FRED_CONFIG } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  if (!FRED_CONFIG.API_KEY) {
    throw new Error('Missing FRED API key');
  }

  // Target FRED API endpoint
  const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json&sort_order=asc`;

  // Route through a CORS proxy to bypass browser cross-origin blocking
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.observations) {
      throw new Error(`Invalid payload structure returned for series: ${seriesId}`);
    }

    // Filter out missing/dot values ("." indicates unrecorded FRED data points)
    return data.observations
      .map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value)
      }))
      .filter(obs => !isNaN(obs.value));

  } catch (err) {
    console.error(`[FRED API Fetch Failed] Series ${seriesId}:`, err);
    throw err;
  }
}
