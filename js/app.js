// js/app.js
import { FRED_CONFIG } from './config.js';
import { fetchMarkerHistory } from './fred-api.js';
import { evaluateRiskRegime, calculateFactorRiskScore, getRiskColorMeta } from './risk-engine.js';
import { renderOverallChart, renderMarkerChart } from './charts.js';

document.addEventListener('DOMContentLoaded', () => {
  setupKeyModalEvents();

  if (!FRED_CONFIG.API_KEY) {
    showKeyModal();
  } else {
    initializeDashboard();
  }
});

function setupKeyModalEvents() {
  const modal = document.getElementById('key-modal');
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
  if (banner) banner.innerText = "Fetching Market Data...";

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

  // Calculate risk score history for each dataset
  Object.keys(FRED_CONFIG.SERIES).forEach((key) => {
    if (dataset[key]) {
      dataset[key] = dataset[key].map(point => ({
        ...point,
        riskScore: calculateFactorRiskScore(key, point.value)
      }));
    }
  });

  // Calculate overall composite regime and history
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

  // 1. Render First Chart: Overall Risk Score Chart
  if (regimeResult.compositeHistory.length > 0) {
    renderOverallChart('overallChart', regimeResult.compositeHistory.slice(-24));
  }

  // 2. Render Individual Marker Charts & Badges
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

      renderMarkerChart(canvasId, key, history.slice(-24));
    }
  });
}
