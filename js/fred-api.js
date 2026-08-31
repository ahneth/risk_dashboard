function logUiError(msg, isWarning = false) {
  const banner = document.getElementById('risk-banner');
  if (!banner) return;
  
  // Shift banner styling to alert state
  banner.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
  if (isWarning) {
    banner.classList.add('bg-amber-950/80', 'text-amber-300', 'border-amber-800');
  } else {
    banner.classList.add('bg-rose-950/80', 'text-rose-300', 'border-rose-800');
  }

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'text-xs font-mono mt-1 border-t border-slate-700/50 pt-1';
  entry.innerHTML = `<strong>[${time}]</strong> ${msg}`;
  banner.appendChild(entry);
}

export async function fetchFredSeries(seriesId, apiKey) {
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
  const startDate = d.toISOString().split('T')[0];

  const primaryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}`;
  
  const proxies = [
    { name: 'CorsProxy', url: `https://corsproxy.io/?url=${encodeURIComponent(primaryUrl)}` },
    { name: 'AllOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}` }
  ];

  let lastError = '';

  for (const proxy of proxies) {
    try {
      const response = await fetch(proxy.url);
      
      if (!response.ok) {
        lastError = `${proxy.name} returned HTTP ${response.status} (${response.statusText})`;
        continue;
      }

      const data = await response.json();
      
      if (data && Array.isArray(data.observations)) {
        if (data.observations.length === 0) {
          logUiError(`Series [${seriesId}]: FRED returned 0 data points.`, true);
          return [];
        }
        return data.observations;
      } else if (data.error_message) {
        lastError = `FRED API Error: ${data.error_message}`;
      }
    } catch (err) {
      lastError = `${proxy.name} network exception: ${err.message}`;
    }
  }

  // Outputs final failure state directly to the screen banner
  logUiError(`Failed to load [${seriesId}]: ${lastError}`);
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
