export async function fetchFredSeries(seriesId, apiKey) {
  const primaryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(primaryUrl)}`
  ];

  for (const url of proxyUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (data && Array.isArray(data.observations) && data.observations.length > 0) {
        return data.observations;
      }
    } catch (err) {
      console.warn(`Proxy attempt failed for ${seriesId}:`, err);
    }
  }

  try {
    const response = await fetch(primaryUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.observations)) {
        return data.observations;
      }
    }
  } catch (err) {
    console.error(`Direct fetch failed for series ${seriesId}:`, err);
  }

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
