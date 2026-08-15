// js/fred-api.js
import { FRED_CONFIG, FALLBACK_DATA } from './config.js';

export async function fetchMarkerHistory(seriesId) {
  try {
    const rawUrl = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json`;
    // Pass through a public CORS proxy for client-side web apps
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rawUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Validate that observations actually exist in response
    if (!data.observations || !Array.isArray(data.observations)) {
      throw new Error('Invalid FRED response structure');
    }

    return parseObservations(data.observations);
  } catch (err) {
    console.warn(`FRED fetch failed for ${seriesId}. Switching to fallback data.`, err);
    return FALLBACK_DATA[seriesId] || [];
  }
}

function parseObservations(observations) {
  return observations
    .filter(obs => obs.value !== '.') // Filter out missing FRED data points
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value)
    }));
}
