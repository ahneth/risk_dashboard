export async function fetchFredSeries(seriesId, apiKey) {
  // Calculate date 24 months ago (YYYY-MM-DD)
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
  const startDate = d.toISOString().split('T')[0];

  const primaryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}`;
  
  // Fixed proxy URL formats
  const proxyUrls = [
    `https://corsproxy.io/?url=${encodeURIComponent(primaryUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`
  ];

  for (const url of proxyUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      
      if (data && Array.isArray(data.observations)) {
        return data.observations;
      }
    } catch (err) {
      console.warn(`Proxy failed for ${seriesId} using ${url}:`, err);
    }
  }

  console.error(`All CORS proxies failed to fetch series: ${seriesId}`);
  return [];
}


export function getLatestValidPoint(observations) {
  if (!observations || !Array.isArray(observations) || observations.length === 0) {
    return null;
  }

  for (let i = observations.length - 1; i >= 0; i--) {
    const val = observations[i]?.value;
    if (val !== undefined && val !== null && val !== '.' && !isNaN(parseFloat(val))) {
      return {
        date: observations[i].date,
        value: parseFloat(val)
      };
    }
  }
  return null;
}

export function cleanSeriesData(observations) {
  if (!Array.isArray(observations)) return [];

  return observations
    .filter(obs => obs && obs.value !== '.' && obs.value !== null && !isNaN(parseFloat(obs.value)))
    .map(obs => ({
      x: obs.date,
      y: parseFloat(obs.value)
    }));
}
