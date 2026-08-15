// js/app.js
import { FRED_CONFIG } from './config.js';
import { fetchMarkerHistory } from './fred-api.js';

const chartInstances = {};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupModal();

  if (!FRED_CONFIG.API_KEY) {
    showModal();
    updateBanner('Please enter a valid FRED API key to initialize the dashboard.', 'error');
    return;
  }

  loadDashboardData();
}

function setupModal() {
  const modalKeyInput = document.getElementById('modal-key-input');
  const btnChangeKey = document.getElementById('btn-change-key');
  const btnSaveKey = document.getElementById('btn-save-key');

  if (FRED_CONFIG.API_KEY) {
    modalKeyInput.value = FRED_CONFIG.API_KEY;
  }

  btnChangeKey.addEventListener('click', () => showModal());

  btnSaveKey.addEventListener('click', () => {
    const key = modalKeyInput.value.trim();
    if (key) {
      localStorage.setItem('FRED_API_KEY', key);
      FRED_CONFIG.API_KEY = key;
      hideModal();
      loadDashboardData();
    }
  });
}

function showModal() {
  document.getElementById('key-modal').classList.remove('hidden');
}

function hideModal() {
  document.getElementById('key-modal').classList.add('hidden');
}

function updateBanner(message, status = 'info') {
  const banner = document.getElementById('risk-banner');
  banner.textContent = message;

  const statusStyles = {
    error: 'bg-rose-950/90 text-rose-300 border-rose-800',
    warning: 'bg-amber-950/90 text-amber-300 border-amber-800',
    success: 'bg-emerald-950/90 text-emerald-300 border-emerald-800',
    info: 'bg-slate-900 text-slate-400 border-slate-800'
  };

  banner.className = `status-banner border ${statusStyles[status] || statusStyles.info}`;
}

function computeRiskScore(key, value) {
  if (value === undefined || value === null || isNaN(value)) return 0;

  switch (key) {
    case 'VIX':
      if (value >= 35) return 9;
      if (value >= 30) return 8;
      if (value >= 25) return 6;
      if (value >= 20) return 4;
      if (value >= 15) return 2;
      return 1;

    case 'YIELD_CURVE':
      if (value < -0.75) return 9;
      if (value < -0.50) return 8;
      if (value < -0.20) return 6;
      if (value < 0.00) return 5;
      if (value < 0.25) return 3;
      return 1;

    case 'CREDIT_SPREAD':
      if (value >= 8.0) return 9;
      if (value >= 6.5) return 8;
      if (value >= 5.0) return 6;
      if (value >= 4.0) return 4;
      if (value >= 3.0) return 2;
      return 1;

    case 'SAHM_RULE':
      if (value >= 0.70) return 9;
      if (value >= 0.50) return 8;
      if (value >= 0.35) return 5;
      if (value >= 0.20) return 3;
      return 1;

    case 'NFCI':
      if (value >= 0.75) return 9;
      if (value >= 0.50) return 8;
      if (value >= 0.20) return 6;
      if (value >= 0.00) return 4;
      if (value >= -0.30) return 3;
      if (value >= -0.50) return 2;
      return 1;

    case 'STLFSI':
      if (value >= 1.50) return 9;
      if (value >= 1.00) return 8;
      if (value >= 0.50) return 6;
      if (value >= 0.00) return 4;
      if (value >= -0.50) return 2;
      return 1;

    default:
      return 0;
  }
}

async function loadDashboardData() {
  updateBanner('Connecting to FRED API and pulling market series...', 'info');

  const seriesKeys = Object.keys(FRED_CONFIG.SERIES);
  const allTargets = [
    ...seriesKeys.map(k => ({ key: k, id: FRED_CONFIG.SERIES[k] })),
    { key: 'SP500', id: FRED_CONFIG.BENCHMARK }
  ];

  const results = {};
  const failedKeys = [];

  // Sequential fetch prevents CORS proxy rate limiting
  for (const item of allTargets) {
    try {
      const data = await fetchMarkerHistory(item.key, item.id);
      results[item.key] = data;
    } catch (err) {
      failedKeys.push(item.key);
      console.error(`[API Error] ${item.key} (${item.id}):`, err);
    }
  }

  if (Object.keys(results).length === 0) {
    updateBanner('API Query Failed: All series requests returned errors. Check FRED Key in settings.', 'error');
    return;
  }

  const allDates = new Set();
  Object.values(results).forEach(series => {
    series.forEach(obs => allDates.add(obs.date));
  });
  const sortedDates = Array.from(allDates).sort();

  const dataMaps = {};
  Object.keys(results).forEach(key => {
    dataMaps[key] = new Map(results[key].map(obs => [obs.date, obs.value]));
  });

  const validSeriesKeys = seriesKeys.filter(k => results[k]);

  const riskScoresTimeline = sortedDates.map(date => {
    let totalScore = 0;
    let validCount = 0;

    validSeriesKeys.forEach(k => {
      const val = dataMaps[k].get(date);
      if (val !== undefined) {
        totalScore += computeRiskScore(k, val);
        validCount++;
      }
    });

    return validCount > 0 ? parseFloat((totalScore / validCount).toFixed(1)) : null;
  });

  const sp500Timeline = results['SP500'] ? sortedDates.map(date => dataMaps['SP500'].get(date) ?? null) : [];

  const latestDate = sortedDates[sortedDates.length - 1];
  const currentRiskScore = riskScoresTimeline[riskScoresTimeline.length - 1];
  const currentSP500 = results['SP500'] ? dataMaps['SP500'].get(latestDate) : null;

  document.getElementById('overall-score-badge').textContent = `Risk: ${currentRiskScore ?? '--'} / 9`;
  document.getElementById('sp500-badge').textContent = `S&P: ${currentSP500 ? currentSP500.toLocaleString() : 'N/A'}`;

  seriesKeys.forEach(key => {
    const valElem = document.getElementById(`${key.toLowerCase()}-val`);
    const scoreBadge = document.getElementById(`${key.toLowerCase()}-score-badge`);

    if (!results[key]) {
      if (valElem) valElem.textContent = 'API ERROR';
      if (scoreBadge) {
        scoreBadge.textContent = 'FAILED';
        scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-rose-950 text-rose-400 border-rose-800';
      }
      return;
    }

    const val = dataMaps[key].get(latestDate);
    const score = computeRiskScore(key, val);

    if (valElem) valElem.textContent = val !== undefined ? val.toLocaleString() : 'N/A';
    if (scoreBadge) {
      scoreBadge.textContent = `Score: ${score}/9`;
      if (score >= 7) scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-rose-950 text-rose-400 border-rose-800';
      else if (score >= 4) scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-amber-950 text-amber-400 border-amber-800';
      else scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-emerald-950 text-emerald-400 border-emerald-800';
    }

    const rawHistory = sortedDates.map(d => dataMaps[key].get(d) ?? null);
    const scoreHistory = sortedDates.map(d => {
      const rawVal = dataMaps[key].get(d);
      return rawVal !== undefined ? computeRiskScore(key, rawVal) : null;
    });

    renderSingleChart(`${key.toLowerCase()}Chart`, key, sortedDates, rawHistory, scoreHistory);
  });

  renderCombinedChart(sortedDates, riskScoresTimeline, sp500Timeline);

  if (failedKeys.length > 0) {
    updateBanner(`Partial Data: Missing [${failedKeys.join(', ')}]`, 'warning');
  } else if (currentRiskScore >= 7) {
    updateBanner(`CRITICAL MACRO RISK DETECTED (Composite Score: ${currentRiskScore}/9)`, 'error');
  } else if (currentRiskScore >= 4) {
    updateBanner(`ELEVATED MARKET RISK (Composite Score: ${currentRiskScore}/9)`, 'warning');
  } else {
    updateBanner(`MACRO SYSTEM CONDITIONS STABLE (Composite Score: ${currentRiskScore}/9)`, 'success');
  }
}

function renderCombinedChart(dates, riskScores, sp500Values) {
  const ctx = document.getElementById('combinedChart').getContext('2d');
  if (chartInstances['combinedChart']) {
    chartInstances['combinedChart'].destroy();
  }

  chartInstances['combinedChart'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Systemic Risk Score (0–9)',
          data: riskScores,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          yAxisID: 'yRisk',
          borderWidth: 2,
          tension: 0.2,
          fill: true,
          spanGaps: true,
          pointRadius: 0,
          pointHitRadius: 6
        },
        {
          label: 'S&P 500 Index',
          data: sp500Values,
          borderColor: '#38bdf8',
          borderDash: [4, 4],
          yAxisID: 'ySP500',
          borderWidth: 2,
          tension: 0.2,
          fill: false,
          spanGaps: true,
          pointRadius: 0,
          pointHitRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#cbd5e1', font: { size: 11 } } }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        yRisk: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 9,
          title: { display: true, text: 'Risk Score (0–9)', color: '#f43f5e', font: { size: 11, weight: 'bold' } },
          grid: { color: '#1e293b' },
          ticks: { color: '#f43f5e', stepSize: 1 }
        },
        ySP500: {
          type: 'linear',
          display: true,
          position: 'right',
          title: { display: true, text: 'S&P 500 ($)', color: '#38bdf8', font: { size: 11, weight: 'bold' } },
          grid: { drawOnChartArea: false },
          ticks: { color: '#38bdf8' }
        }
      }
    }
  });
}

function renderSingleChart(canvasId, label, dates, rawValues, scoreValues) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Risk Score (0–9)',
          data: scoreValues,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          yAxisID: 'yScore',
          borderWidth: 2,
          stepped: 'middle',
          spanGaps: true,
          pointRadius: 0,
          pointHitRadius: 6,
          fill: false,
          order: 1
        },
        {
          label: `${label} (Raw)`,
          data: rawValues,
          borderColor: '#64748b',
          borderDash: [2, 2],
          yAxisID: 'yRaw',
          borderWidth: 1.5,
          tension: 0.2,
          spanGaps: true,
          pointRadius: 0,
          pointHitRadius: 6,
          fill: false,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: { color: '#94a3b8', font: { size: 9 }, boxWidth: 8, padding: 4 }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 5 }
        },
        yScore: {
          type: 'linear',
          display: true,
          position: 'left',
          min: 0,
          max: 9,
          grid: { color: 'rgba(244, 63, 94, 0.1)' },
          ticks: { color: '#f43f5e', font: { size: 9, weight: 'bold' }, stepSize: 3 }
        },
        yRaw: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#64748b', font: { size: 8 } }
        }
      }
    }
  });
}
