// js/fred-api.js
import { FRED_CONFIG } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  if (!FRED_CONFIG.API_KEY) {
    throw new Error('Missing FRED API key');
  }

  // Bound query to last 2 years (prevents proxy timeouts from giant payloads)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);
  const startStr = startDate.toISOString().split('T')[0];

  const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY.trim()}&file_type=json&sort_order=asc&observation_start=${startStr}`;

  // Multi-proxy fallback strategy
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];

  let lastError;

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Catch invalid API Key responses from FRED
      if (data.error_code || data.error_message) {
        throw new Error(`FRED API Error ${data.error_code}: ${data.error_message}`);
      }

      if (!data.observations) {
        throw new Error(`No observations key in payload for ${seriesId}`);
      }

      return data.observations
        .map(obs => ({
          date: obs.date,
          value: parseFloat(obs.value)
        }))
        .filter(obs => !isNaN(obs.value));

    } catch (err) {
      lastError = err;
      console.warn(`[Proxy Fallback] Failed for ${seriesId} via proxy. Trying next...`, err.message);
    }
  }

  throw lastError || new Error(`All endpoints failed for ${seriesId}`);
}
