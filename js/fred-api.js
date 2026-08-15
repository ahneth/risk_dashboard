// js/fred-api.js
import { FRED_CONFIG, FALLBACK_DATA } from './config.js';

/**
 * Fetches historical observations for a given FRED series ID.
 * Routes through a CORS proxy and safely degrades to fallback data on error.
 * @param {string} seriesId 
 * @returns {Promise<Array<{date: string, value: number}>>}
 */
export async function fetchMarkerHistory(seriesId) {
  try {
    // 1. Stagger requests by 250ms to prevent FRED API rate-limit drops
    await new Promise(resolve => setTimeout(resolve, 250));

    const rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json`;
    
    // 2. Bypass browser CORS restrictions for GitHub Pages
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 3. Validate FRED JSON response structure
    if (!data || !Array.isArray(data.observations)) {
      throw new Error(`Invalid response structure for series: ${seriesId}`);
    }

    // 4. Parse observations into clean numeric data points
    const cleanHistory = parseObservations(data.observations);
    if (cleanHistory.length === 0) {
      throw new Error(`No valid numeric data points returned for series: ${seriesId}`);
    }

    return cleanHistory;
  } catch (err) {
    console.warn(`[FRED API] Fetch failed for ${seriesId}. Loading fallback dataset. Cause:`, err.message);
    return FALLBACK_DATA[seriesId] || [];
  }
}

/**
 * Filters out missing FRED data entries (denoted as '.') and parses numerical values.
 */
function parseObservations(observations) {
  return observations
    .filter(obs => obs.value && obs.value !== '.')
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }));
}
