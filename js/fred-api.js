// js/fred-api.js
import { FRED_CONFIG } from './config.js';

export async function fetchMarkerHistory(key, seriesId) {
  const apiKey = (FRED_CONFIG.API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing FRED API key');
  }

  // Bound query to last 2 years for fast lightweight payloads
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 2);
  const startStr = startDate.toISOString().split('T')[0];

  const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=asc&observation_start=${startStr}`;

  const proxyUrls = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const proxyUrl of proxyUrls) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;

      const text = await res.text();
      // Guard against HTML error pages from proxies
      if (!text.trim().startsWith('{')) {
        console.warn(`[Proxy Guard] Non-JSON payload returned for ${seriesId}`);
        continue;
      }

      const data = JSON.parse(text);

      if (data.error_code || data.error_message) {
        throw new Error(`FRED API Error: ${data.error_message}`);
      }

      if (data.observations && Array.isArray(data.observations)) {
        return data.observations
          .map(obs => ({ date: obs.date, value: parseFloat(obs.value) }))
          .filter(obs => !isNaN(obs.value));
      }
    } catch (e) {
      console.warn(`Proxy attempt failed for ${seriesId}:`, e.message);
    }
  }

  throw new Error(`Unable to load series data for ${seriesId}`);
}
