export async function fetchFredSeries(seriesId, apiKey) {
  // Use direct FRED endpoint with alternative browser-supported public proxy fallbacks
  const primaryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(primaryUrl)}`,
    primaryUrl
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
      console.warn(`Attempt failed for ${seriesId} using URL: ${url}`, err);
    }
  }

  console.error(`All fetch attempts failed for series: ${seriesId}`);
  return [];
}

export function getLatestValidPoint(observations) {
  if (!observations || !Array.isArray(observations) || observations.length === 0) {
    return null;
  }

  for (let i = observations.length - 1; i >= 0; i--) {
    const val = observations[i].value;
    if (val !== '.' && val !== undefined && val !== null && !isNaN(parseFloat(val))) {
      return {
        date: observations[i].date,
        value: parseFloat(val)
      };
    }
  }
  return null;
}

export function cleanSeriesData(observations) {
  if (!observations || !Array.isArray(observations)) return [];

  return observations
    .filter(obs => obs.value !== '.' && obs.value !== undefined && !isNaN(parseFloat(obs.value)))
    .map(obs => ({
      x: obs.date,
      y: parseFloat(obs.value)
    }));
}
