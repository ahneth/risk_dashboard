/**
 * Locates newest valid non-null numeric observation.
 */
export function getLatestValidPoint(observations) {
  if (!Array.isArray(observations)) return null;

  for (let i = observations.length - 1; i >= 0; i--) {
    const rawVal = observations[i]?.value;
    if (rawVal !== undefined && rawVal !== null && rawVal !== '.' && !isNaN(parseFloat(rawVal))) {
      return {
        value: parseFloat(rawVal),
        date: observations[i].date
      };
    }
  }
  return null;
}

/**
 * Filters out holiday/missing values for Chart.js
 */
export function cleanSeriesData(observations) {
  if (!Array.isArray(observations)) return [];

  return observations
    .filter(obs => obs.value !== '.' && obs.value !== null && obs.value !== undefined)
    .map(obs => ({
      x: obs.date,
      y: parseFloat(obs.value)
    }))
    .filter(point => !isNaN(point.y));
}

/**
 * Queries FRED API via CORS proxy with a strict 24-month start date parameter
 */
export async function fetchFredSeries(seriesId, apiKey) {
  // Dynamically calculate start date 24 months ago from today (YYYY-MM-DD)
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 24);
  const startDateStr = startDate.toISOString().split('T')[0];

  const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDateStr}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fredUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`FRED API fetch failed (${response.status}) for ${seriesId}`);
  }

  const data = await response.json();
  return data.observations || [];
}
