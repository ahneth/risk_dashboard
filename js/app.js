// js/app.js
import { FRED_CONFIG } from './config.js';
import { fetchMarkerHistory } from './fred-api.js';
import { evaluateRiskRegime, calculateFactorRiskScore, getRiskColorMeta } from './risk-engine.js';
import { renderOverallChart, renderBenchmarkChart, renderMarkerChart } from './charts.js';

document.addEventListener('DOMContentLoaded', () => {
  setupKeyModalEvents();

  if (!FRED_CONFIG.API_KEY) {
    showKeyModal();
  } else {
    initializeDashboard();
  }
});

function setupKeyModalEvents() {
  const keyInput = document.getElementById('modal-key-input');
  const saveBtn = document.getElementById('btn-save-key');
  const fallbackBtn = document.getElementById('btn-use-fallback');
  const changeKeyBtn = document.getElementById('btn-change-key');

  saveBtn?.addEventListener('click', () => {
    const val = keyInput.value.trim();
    if (val) {
      localStorage.setItem('FRED_API_KEY', val);
      hideKeyModal();
      initializeDashboard();
    }
  });

  fallbackBtn?.addEventListener('click', () => {
    hideKeyModal();
    initializeDashboard();
  });

  changeKeyBtn?.addEventListener('click', () => {
    if (keyInput) keyInput.value = FRED_CONFIG.API_KEY;
    showKeyModal();
  });
}

function showKeyModal() {
  document.getElementById('key-modal')?.classList.remove('hidden');
}

function hideKeyModal() {
  document.getElementById('key-modal')?.classList.add('hidden');
}

async function initializeDashboard() {
  const banner = document.getElementById('risk-banner');
  if (banner) banner.innerText = "Fetching 24 Months Market Data...";

  // 1. Fetch Benchmark Data (S&P 500)
  let sp500History = [];
  try {
    sp500History = await fetchMarkerHistory('SP500', FRED_CONFIG.BENCHMARK);
  } catch (e) {
    console.error('Error loading S&P 500:', e);
  }

  // 2. Fetch Risk Factor Data
  const seriesEntries = Object.entries(FRED_CONFIG.SERIES);
  const dataset = {};

  for (const [key, seriesId] of seriesEntries) {
    try {
      const history = await fetchMarkerHistory(key, seriesId);
      dataset[key] = Array.isArray(history) && history.length > 0 ? history : [];
    } catch (e) {
      console.error(`Error loading ${key}:`, e);
      dataset[key] = [];
    }
  }

  // Calculate 0-9 risk scores for each monthly data point
  Object.keys(FRED_CONFIG.SERIES).forEach((key) => {
    if (dataset[key]) {
      dataset[key] = dataset[key].map(point => ({
        ...point,
        riskScore: calculateFactorRiskScore(key, point.value)
      }));
    }
  });

  // Calculate composite regime across the 24 months
  const regimeResult = evaluateRiskRegime(dataset);

  // Update Global Banner & Header Score Badge
  if (banner) {
    const meta = getRiskColorMeta(regimeResult.roundedScore);
    banner.innerText = `MARKET RISK REGIME: ${regimeResult.overallRegime} (${regimeResult.compositeScore} / 9)`;
    banner.className = `status-banner ${meta.bannerClass}`;
  }

  const overallScoreElem = document.getElementById('overall-score-badge');
  if (overallScoreElem) {
    const meta = getRiskColorMeta(regimeResult.roundedScore);
    overallScoreElem.innerText = `${regimeResult.compositeScore} / 9`;
    overallScoreElem.className = `text-lg font-black px-3 py-1 rounded-full border ${meta.badgeClass}`;
  }

  // Update S&P 500 Header Badge
  const sp500Badge = document.getElementById('sp500-badge');
  if (sp500Badge && sp500History.length > 0) {
    const latestSpVal = sp500History[sp500History.length - 1].value;
    const firstSpVal = sp500History[0].value;
    const pctChange = (((latestSpVal - firstSpVal) / firstSpVal) * 100).toFixed(1);
    const sign = pctChange >= 0 ? '+' : '';
    sp500Badge.innerText = `${latestSpVal.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${sign}${pctChange}% 24M)`;
  }

  // CHART 1: Render Overall Risk Score Chart
  if (regimeResult.compositeHistory.length > 0) {
    renderOverallChart('overallChart', regimeResult.compositeHistory);
  }

  // CHART 2: Render S&P 500 Benchmark Chart
  if (sp500History.length > 0) {
    renderBenchmarkChart('sp500Chart', sp500History);
  }

  // CHART GRID: Render Individual Marker Charts
  Object.keys(FRED_CONFIG.SERIES).forEach((key) => {
    const history = dataset[key] || [];
    const canvasId = `${key.toLowerCase()}Chart`;
    const valElem = document.getElementById(`${key.toLowerCase()}-val`);
    const scoreBadge = document.getElementById(`${key.toLowerCase()}-score-badge`);

    if (history.length > 0) {
      const latestPoint = history[history.length - 1];
      const latestVal = latestPoint.value;
      const latestScore = latestPoint.riskScore;
      const meta = getRiskColorMeta(latestScore);

      if (valElem) valElem.innerText = typeof latestVal === 'number' ? latestVal.toFixed(2) : latestVal;
      
      if (scoreBadge) {
        scoreBadge.innerText = `Risk Score: ${latestScore} / 9`;
        scoreBadge.className = `text-xs font-bold px-2.5 py-1 rounded-md border ${meta.badgeClass}`;
      }

      renderMarkerChart(canvasId, key, history);
    }
  });
}
