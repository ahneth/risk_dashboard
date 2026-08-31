let cacheData = null;

export async function fetchFredSeries(seriesId, apiKey) {
  // Load cached JSON bundle once per page load
  if (!cacheData) {
    try {
      const res = await fetch('./data/fred_cache.json?v=' + Date.now());
      if (res.ok) {
        cacheData = await res.json();
      }
    } catch (err) {
      console.warn('Local cache not available, falling back to direct API call.');
    }
  }

  // Return data from GitHub static cache if present
  if (cacheData) {
    const key = Object.keys(cacheData).find(
      k => k === seriesId || cacheData[k]?.seriesId === seriesId
    );
    if (key && cacheData[key]) {
      return cacheData[key];
    }
  }

  // Fallback direct request for local development
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
  const startDate = d.toISOString().split('T')[0];
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.observations || [];
  } catch (err) {
    console.error(`Fetch failed for ${seriesId}:`, err);
    return [];
  }
}

export function getLatestValidPoint(observations) {
  if (!Array.isArray(observations) || observations.length === 0) return null;
  for (let i = observations.length - 1; i >= 0; i--) {
    const obs = observations[i];
    if (obs.value !== '.' && !isNaN(parseFloat(obs.value))) {
      return { date: obs.date, value: parseFloat(obs.value) };
    }
  }
  return null;
}

export function cleanSeriesData(observations) {
  if (!Array.isArray(observations)) return [];
  return observations
    .filter(obs => obs.value !== '.' && !isNaN(parseFloat(obs.value)))
    .map(obs => ({ x: obs.date, y: parseFloat(obs.value) }));
}
