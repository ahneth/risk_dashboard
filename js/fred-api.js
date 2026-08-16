export async function fetchFredSeries(seriesId, apiKey) {
  const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const wrapper = await response.json();
    let data;
    
    if (wrapper.contents) {
      data = JSON.parse(wrapper.contents);
    } else {
      data = wrapper;
    }

    if (data && data.observations) {
      return data.observations;
    } else {
      console.warn(`No observations found for series: ${seriesId}`, data);
      return [];
    }
  } catch (err) {
    console.warn(`Proxy fetch failed for ${seriesId}, attempting direct fetch...`, err);
    
    try {
      const directResponse = await fetch(targetUrl);
      const directData = await directResponse.json();
      return directData.observations || [];
    } catch (directErr) {
      console.error(`Failed completely to fetch series ${seriesId}:`, directErr);
      return [];
    }
  }
}

/**
 * Grabs the absolute latest valid (non-dot) observation from a series array.
 */
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

/**
 * Cleans observations and ensures forward-filling capability for timeline alignment.
 */
export function cleanSeriesData(observations) {
  if (!observations || !Array.isArray(observations)) return [];

  return observations
    .filter(obs => obs.value !== '.' && obs.value !== undefined && !isNaN(parseFloat(obs.value)))
    .map(obs => ({
      x: obs.date,
      y: parseFloat(obs.value)
    }));
}
