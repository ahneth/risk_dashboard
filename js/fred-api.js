// js/fred-api.js
import { FRED_CONFIG, FALLBACK_DATA } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  try {
    if (!FRED_CONFIG.API_KEY) {
      throw new Error('No API key provided.');
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.observations)) {
      throw new Error('Invalid observation array structure');
    }

    const cleanHistory = parseObservations(data.observations);
    if (cleanHistory.length === 0) {
      throw new Error('Zero numeric data points parsed');
    }

    return cleanHistory;
  } catch (err) {
    console.warn(`[FRED API] Using fallback data for key "${key}" (${seriesId}). Reason:`, err.message);
    // Correct lookup using dictionary key instead of FRED series ID
    return FALLBACK_DATA[key] || [];
  }
}

function parseObservations(observations) {
  return observations
    .filter(obs => obs.value && obs.value !== '.')
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }));
}
