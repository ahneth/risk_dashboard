import { SERIES_IDS, RISK_THRESHOLDS } from './config.js';
import { getLatestValidPoint, cleanSeriesData, fetchFredSeries } from './fred-api.js';
import { initChartDefaults, renderCardChart, renderCombinedChart } from './charts.js';

let apiKey = localStorage.getItem('fred_api_key') || '';

document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults();
  initApp();
});

function initApp() {
  setupModalEvents();

  if (!apiKey) {
    showKeyModal(true);
    updateBanner('FRED API key missing. Please enter your key to load data.', 'warning');
    return;
  }

  loadDashboardData();
}

async function loadDashboardData() {
  updateBanner('Fetching macroeconomic data from FRED...', 'info');

  const seriesData = {};
  const fetchPromises = Object.entries(SERIES_IDS).map(async ([key, seriesId]) => {
    try {
      const obs = await fetchFredSeries(seriesId, apiKey);
      seriesData[key] = obs;
    } catch (err) {
      console.error(`Failed loading ${key}:`, err);
      seriesData[key] = [];
    }
  });

  await Promise.all(fetchPromises);

  let totalRiskScore = 0;
  const indicators = ['vix', 'yield_curve', 'credit_spread', 'sahm_rule', 'nfci', 'stlfsi'];

  indicators.forEach((id) => {
    const obs = seriesData[id] || [];
    const unit = (id === 'yield_curve' || id === 'credit_spread' || id === 'sahm_rule') ? '%' : '';

    const latest = updateCardValue(id, obs, unit);
    let isHigh = false;

    if (latest) {
      isHigh = RISK_THRESHOLDS[id] ? RISK_THRESHOLDS[id](latest.value) : false;
      if (isHigh) totalRiskScore += 1.5;
      updateIndicatorBadge(id, isHigh);
    } else {
      updateIndicatorBadge(id, false, true);
    }

    const cleanData = cleanSeriesData(obs);
    renderCardChart(`${id}Chart`, cleanData, isHigh ? '#f43f5e' : '#38bdf8');
  });

  const sp500Latest = getLatestValidPoint(seriesData.sp500 || []);
  const sp500Badge = document.getElementById('sp500-badge');
  if (sp500Badge && sp500Latest) {
    sp500Badge.textContent = `S&P: ${sp500Latest.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  const scoreDisplay = Math.min(Math.round(totalRiskScore), 9);
  updateOverallScore(scoreDisplay);

  renderCombinedChart(
    cleanSeriesData(seriesData.sp500 || []),
    cleanSeriesData(seriesData.vix || [])
  );

  updateBanner('Dashboard updated successfully.', 'success');
}

function updateCardValue(indicatorId, observations, unit = '') {
  const valElement = document.getElementById(`${indicatorId}-val`);
  if (!valElement) return null;

  const latest = getLatestValidPoint(observations);

  if (latest) {
    const dateObj = new Date(`${latest.date}T00:00:00Z`);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });

    valElement.innerHTML = `
      ${latest.value.toFixed(2)}${unit}
      <span class="text-xs font-normal text-slate-400 block sm:inline sm:ml-1">
        (${formattedDate})
      </span>
    `;
  } else {
    valElement.textContent = 'N/A';
  }

  return latest;
}

function updateIndicatorBadge(indicatorId, isHighRisk, isMissing = false) {
  const badge = document.getElementById(`${indicatorId}-score-badge`);
  if (!badge) return;

  if (isMissing) {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-slate-800 text-slate-500 border-slate-700';
    badge.textContent = 'Status: N/A';
    return;
  }

  if (isHighRisk) {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
    badge.textContent = 'HIGH RISK';
  } else {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-emerald-950 text-emerald-300 border-emerald-800';
    badge.textContent = 'NORMAL';
  }
}

function updateOverallScore(score) {
  const badge = document.getElementById('overall-score-badge');
  if (!badge) return;

  badge.textContent = `Risk: ${score} / 9`;

  if (score >= 6) {
    badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800';
  } else if (score >= 3) {
    badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800';
  } else {
    badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800';
  }
}

function updateBanner(message, type = 'info') {
  const banner = document.getElementById('risk-banner');
  if (!banner) return;

  banner.textContent = message;
  const baseStyles = 'border p-3 rounded-lg text-sm font-medium transition-all ';

  if (type === 'danger') banner.className = baseStyles + 'bg-rose-950/60 text-rose-200 border-rose-800';
  else if (type === 'warning') banner.className = baseStyles + 'bg-amber-950/60 text-amber-200 border-amber-800';
  else if (type === 'success') banner.className = baseStyles + 'bg-slate-900 text-slate-300 border-slate-800';
  else banner.className = baseStyles + 'bg-slate-900 text-slate-400 border-slate-800';
}

function setupModalEvents() {
  const btnChangeKey = document.getElementById('btn-change-key');
  const btnSaveKey = document.getElementById('btn-save-key');
  const keyInput = document.getElementById('modal-key-input');

  if (keyInput && apiKey) {
    keyInput.value = apiKey;
  }

  if (btnChangeKey) {
    btnChangeKey.addEventListener('click', () => showKeyModal(true));
  }

  if (btnSaveKey) {
    btnSaveKey.addEventListener('click', () => {
      const val = keyInput.value.trim();
      if (val) {
        apiKey = val;
        localStorage.setItem('fred_api_key', val);
        showKeyModal(false);
        loadDashboardData();
      }
    });
  }
}

function showKeyModal(show) {
  const modal = document.getElementById('key-modal');
  if (!modal) return;
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}
