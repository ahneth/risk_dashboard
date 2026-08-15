import { FRED_CONFIG } from './config.js';
import { fetchMarkerHistory } from './fred-api.js';
import { evaluateRiskRegime } from './risk-engine.js';
import { renderTrendChart } from './charts.js';

document.addEventListener('DOMContentLoaded', async () => {
  const seriesKeys = Object.keys(FRED_CONFIG.SERIES);
  const dataset = {};

  for (const key of seriesKeys) {
    const history = await fetchMarkerHistory(FRED_CONFIG.SERIES[key]);
    dataset[key] = history;
    
    // Render individual 24-month chart
    renderTrendChart(`${key.toLowerCase()}Chart`, key, history.slice(-24));
  }

  // Calculate & update regime status
  const latestValues = extractLatest(dataset);
  const regimeResult = evaluateRiskRegime(latestValues);
  updateUIBanner(regimeResult.overallRegime);
});
