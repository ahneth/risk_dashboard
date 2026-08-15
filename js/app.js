// js/app.js
import { FRED_CONFIG } from './config.js';
import { fetchMarkerHistory } from './fred-api.js';
import { evaluateRiskRegime } from './risk-engine.js';
import { renderTrendChart } from './charts.js';

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
    } else {
      document.getElementById('modal-error')?.classList.remove('hidden');
    }
  });

  fallbackBtn?.addEventListener('click', () => {
    hideKeyModal();
    initializeDashboard();
  });

  changeKeyBtn?.addEventListener('click', () => {
    keyInput.value = FRED_CONFIG.API_KEY;
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

  // Fetch series using key & seriesId
  for (const [key, seriesId] of seriesEntries) {
    try {
      const history = await fetchMarkerHistory(key, seriesId);
      dataset[key] = Array.isArray(history) && history.length > 0 ? history : [];
    } catch (e) {
      console.error(`Error loading ${key}:`, e);
      dataset[key] = [];
    }
  }

  // Render individual indicator cards and line charts
  Object.keys(FRED_CONFIG.SERIES).forEach((key) => {
    const history = dataset[key] || [];
    const canvasId = `${key.toLowerCase()}Chart`;
    const valElem = document.getElementById(`${key.toLowerCase()}-val`);

    if (history.length > 0) {
      const latestVal = history[history.length - 1].value;
      if (valElem) valElem.innerText = typeof latestVal === 'number' ? latestVal.toFixed(2) : latestVal;
      renderTrendChart(canvasId, key, history.slice(-24));
    } else {
      if (valElem) valElem.innerText = "N/A";
    }
  });

  // Calculate weighted composite score
  const latestValues = {};
  Object.keys(dataset).forEach(k => {
    if (dataset[k].length > 0) {
      latestValues[k] = dataset[k][dataset[k].length - 1].value;
    }
  });

  const regimeResult = evaluateRiskRegime(latestValues);
  
  if (banner) {
    banner.innerText = `MARKET RISK REGIME: ${regimeResult.overallRegime} (WEIGHTED SCORE: ${regimeResult.compositeScore}/100)`;
    banner.className = `status-banner regime-${regimeResult.overallRegime.toLowerCase()}`;
  }
}
