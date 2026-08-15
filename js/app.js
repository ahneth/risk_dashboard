// js/app.js
import { FRED_CONFIG } from './config.js';
import { fetchMarkerHistory } from './fred-api.js';
import { evaluateRiskRegime } from './risk-engine.js';
import { renderTrendChart } from './charts.js';

document.addEventListener('DOMContentLoaded', async () => {
  const seriesEntries = Object.entries(FRED_CONFIG.SERIES);
  const dataset = {};

  // Fetch all factors in parallel without blocking each other
  const results = await Promise.allSettled(
    seriesEntries.map(async ([key, seriesId]) => {
      const history = await fetchMarkerHistory(seriesId);
      return { key, history };
    })
  );

  // Process results for each card
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { key, history } = result.value;
      dataset[key] = history;

      // Update current metric readout in UI
      const latestVal = history.length > 0 ? history[history.length - 1].value : '--';
      const valElem = document.getElementById(`${key.toLowerCase()}-val`);
      if (valElem) valElem.innerText = latestVal;

      // Render 24-month trendline chart
      renderTrendChart(`${key.toLowerCase()}Chart`, key, history.slice(-24));
    }
  });

  // Calculate composite RAG status across all loaded factors
  const latestValues = extractLatestValues(dataset);
  const regimeResult = evaluateRiskRegime(latestValues);

  // Render overall risk banner & individual status badges
  updateRiskUI(regimeResult);
});

function extractLatestValues(dataset) {
  const latest = {};
  for (const [key, history] of Object.entries(dataset)) {
    if (history && history.length > 0) {
      latest[key] = history[history.length - 1].value;
    }
  }
  return latest;
}

function updateRiskUI(regimeResult) {
  const banner = document.getElementById('risk-banner');
  if (banner) {
    banner.innerText = `MARKET RISK REGIME: ${regimeResult.overallRegime}`;
    banner.className = `status-banner regime-${regimeResult.overallRegime.toLowerCase()}`;
  }
}
