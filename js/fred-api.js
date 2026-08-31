// Master proxy definitions
const INITIAL_PROXIES = [
  { name: 'CorsProxy.io', build: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
  { name: 'AllOrigins', build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
  { name: 'CodeTabs', build: (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
  { name: 'ThingProxy', build: (url) => `https://thingproxy.freeboard.io/fetch/${url}` }
];

// Active proxy pool (persists across fetches during the page session)
let activeProxies = [...INITIAL_PROXIES];

export async function fetchFredSeries(seriesId, apiKey) {
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
  const startDate = d.toISOString().split('T')[0];

  const primaryUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}`;

  // Reset proxy pool if all proxies previously failed
  if (activeProxies.length === 0) {
    activeProxies = [...INITIAL_PROXIES];
  }

  for (let i = 0; i < activeProxies.length; i++) {
    const proxy = activeProxies[i];
    const proxyUrl = proxy.build(primaryUrl);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second hard cutoff

      const response = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data && Array.isArray(data.observations) && data.observations.length > 0) {
        
        // SUCCESS: Move this working proxy to position 0 so all remaining indicators use it first
        if (i > 0) {
          activeProxies.splice(i, 1);
          activeProxies.unshift(proxy);
        }
        
        return data.observations;
      }
      throw new Error('Invalid payload');
    } catch (err) {
      console.warn(`[${proxy.name}] failed for ${seriesId}. Dropping proxy from active list.`);
      
      // FAILURE: Instantly remove this proxy so subsequent series skip it
      activeProxies.splice(i, 1);
      i--; // Adjust index after array shift
    }
  }

  logUiError(`Failed to load [${seriesId}]: All active proxies failed.`);
  return [];
}

function logUiError(msg) {
  const banner = document.getElementById('risk-banner');
  if (!banner) return;
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'text-xs font-mono mt-1 text-rose-300';
  entry.innerHTML = `<strong>[${time}]</strong> ${msg}`;
  banner.appendChild(entry);
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
