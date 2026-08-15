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

/* API Key Modal & UI Status Management */
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

/* Individual Indicator Threshold Scoring (0 to 9 scale) */
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
      if (value >= 0.25) return 6;
      if (value >= 0.00) return 4;
      if (value >= -0.25) return 2;
      return 1;

    case 'BREADTH':
      // Evaluated as index momentum score
      if (value < 1500) return 8;
      if (value < 1700) return 6;
      if (value < 1900) return 4;
      return 2;

    default:
      return 0;
  }
}

/* Main Data Execution Pipeline */
async function loadDashboardData() {
  updateBanner('Connecting to FRED API and pulling market series...', 'info');

  try {
    const seriesKeys = Object.keys(FRED_CONFIG.SERIES);

    // Fetch all market markers and benchmark in parallel
    const requests = seriesKeys.map(key =>
      fetchMarkerHistory(key, FRED_CONFIG.SERIES[key]).then(data => ({ key, data }))
    );

    requests.push(
      fetchMarkerHistory('SP500', FRED_CONFIG.BENCHMARK).then(data => ({ key: 'SP500', data }))
    );

    const responses = await Promise.all(requests);
    const results = {};
    responses.forEach(res => { results[res.key] = res.data; });

    // Combine date ranges into unified chronological timeline
    const allDates = new Set();
    Object.values(results).forEach(series => {
      series.forEach(obs => allDates.add(obs.date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Index observations by date string for alignment
    const dataMaps = {};
    Object.keys(results).forEach(key => {
      dataMaps[key] = new Map(results[key].map(obs => [obs.date, obs.value]));
    });

    // Compute composite risk score for each date in history
    const riskScoresTimeline = sortedDates.map(date => {
      let totalScore = 0;
      let validCount = 0;

      seriesKeys.forEach(k => {
        const val = dataMaps[k].get(date);
        if (val !== undefined) {
          totalScore += computeRiskScore(k, val);
          validCount++;
        }
      });

      return validCount > 0 ? parseFloat((totalScore / validCount).toFixed(1)) : null;
    });

    const sp500Timeline = sortedDates.map(date => dataMaps['SP500'].get(date) ?? null);

    // Update Latest Stats and Score Cards
    const latestDate = sortedDates[sortedDates.length - 1];
    const currentRiskScore = riskScoresTimeline[riskScoresTimeline.length - 1];
    const currentSP500 = dataMaps['SP500'].get(latestDate);

    document.getElementById('overall-score-badge').textContent = `Risk: ${currentRiskScore ?? '--'} / 9`;
    document.getElementById('sp500-badge').textContent = `S&P: ${currentSP500 ? currentSP500.toLocaleString() : '--'}`;

    seriesKeys.forEach(key => {
      const val = dataMaps[key].get(latestDate);
      const score = computeRiskScore(key, val);
      const valElem = document.getElementById(`${key.toLowerCase()}-val`);
      const scoreBadge = document.getElementById(`${key.toLowerCase()}-score-badge`);

      if (valElem) valElem.textContent = val !== undefined ? val.toLocaleString() : 'N/A';
      if (scoreBadge) {
        scoreBadge.textContent = `Score: ${score}/9`;
        if (score >= 7) scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-rose-950 text-rose-400 border-rose-800';
        else if (score >= 4) scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-amber-950 text-amber-400 border-amber-800';
        else scoreBadge.className = 'text-xs font-bold px-2 py-1 rounded border bg-emerald-950 text-emerald-400 border-emerald-800';
      }
    });

    // Render Charts
    renderCombinedChart(sortedDates, riskScoresTimeline, sp500Timeline);

    seriesKeys.forEach(key => {
      const history = sortedDates.map(d => dataMaps[key].get(d) ?? null);
      renderSingleChart(`${key.toLowerCase()}Chart`, key, sortedDates, history);
    });

    // Final Status Banner Trigger
    if (currentRiskScore >= 7) {
      updateBanner(`CRITICAL MACRO RISK DETECTED (Composite Score: ${currentRiskScore}/9)`, 'error');
    } else if (currentRiskScore >= 4) {
      updateBanner(`ELEVATED MARKET RISK (Composite Score: ${currentRiskScore}/9)`, 'warning');
    } else {
      updateBanner(`MACRO SYSTEM CONDITIONS STABLE (Composite Score: ${currentRiskScore}/9)`, 'success');
    }

  } catch (err) {
    console.error('[Dashboard Error]', err);
    updateBanner(`API Query Failed: ${err.message}`, 'error');
    throw err; // Strict execution halt - no fallback render
  }
}

/* Dual-Axis Combined Chart (Risk Score vs S&P 500) */
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
          fill: true
        },
        {
          label: 'S&P 500 Index',
          data: sp500Values,
          borderColor: '#38bdf8',
          borderDash: [4, 4],
          yAxisID: 'ySP500',
          borderWidth: 2,
          tension: 0.2,
          fill: false
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

/* Single Indicator Chart Component */
function renderSingleChart(canvasId, label, dates, values) {
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
      datasets: [{
        label: label,
        data: values,
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.08)',
        borderWidth: 1.5,
        tension: 0.2,
        fill: true,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: '#1e293b' },
          ticks: { color: '#94a3b8', font: { size: 9 } }
        }
      }
    }
  });
}
