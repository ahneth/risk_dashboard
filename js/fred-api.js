import { FRED_CONFIG, FALLBACK_DATA } from './config.js';

export async function fetchMarkerHistory(seriesId) {
  try {
    // Add rate-limiting delay between queries
    await new Promise(res => setTimeout(res, 300)); 
    
    const url = `${FRED_CONFIG.BASE_URL}?series_id=${seriesId}&api_key=${FRED_CONFIG.API_KEY}&file_type=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('FRED Rate limit or network error');
    
    const data = await response.json();
    return parseObservations(data.observations);
  } catch (err) {
    console.warn(`Using fallback data for ${seriesId}:`, err);
    return FALLBACK_DATA[seriesId] || [];
  }
}
