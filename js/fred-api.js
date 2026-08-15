// js/fred-api.js
import { FRED_CONFIG, FALLBACK_DATA } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  try {
    if (!FRED_CONFIG.API_KEY) {
      throw new Error('No API key provided.');
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    // Calculate exact date 24 months ago
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);
    const startDateStr = startDate.toISOString().split('T')[0];

    // frequency=m normalizes daily/weekly metrics into 24 monthly points
    const rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json&observation_start=${startDateStr}&frequency=m&aggregation_method=eop`;
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
    return FALLBACK_DATA[key] || [];
  }
}

function parseObservations(observations) {
  return observations
    .filter(obs => obs.value && obs.value !== '.')
    .map(obs => ({
      // Format as YYYY-MM for clean chart labels
      date: obs.date.substring(0, 7),
      value: parseFloat(obs.value)
    }));
}
