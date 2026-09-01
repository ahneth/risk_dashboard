let cacheData = null;

// We now pass the internal dictionary key (e.g., 'yield_curve'), not the FRED ID
export async function fetchFredSeries(indicatorKey) {
  if (!cacheData) {
    try {
      const res = await fetch('./data/fred_cache.json?v=' + Date.now());
      if (res.ok) {
        cacheData = await res.json();
      } else {
        throw new Error('Cache file not found');
      }
    } catch (err) {
      console.error('Failed to load local cache. Ensure GitHub Actions has run:', err);
      return [];
    }
  }
  
  return cacheData[indicatorKey] || [];
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
