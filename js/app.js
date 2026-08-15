/**
 * Macro Systemic Risk Dashboard Engine
 * Handles FRED API fetches, backward non-null observation scans,
 * systemic risk score evaluation, and line charts with hidden point markers.
 */

// Global state and chart instances store
const charts = {};
let apiKey = localStorage.getItem('fred_api_key') || '';

// FRED Series IDs
const SERIES_IDS = {
  sp500: 'SP500',
  vix: 'VIXCLS',
  yield_curve: 'T10Y2Y',
  credit_spread: 'BAMLH0A0HYM2',
  sahm_rule: 'SAHMREALTIME',
  nfci: 'NFCI',
  stlfsi: 'STLFSI4'
};

// High Risk Evaluation Rules
const RISK_THRESHOLDS = {
  vix: (val) => val >= 25.0,
  yield_curve: (val) => val < -0.20,
  credit_spread: (val) => val >= 5.0,
  sahm_rule: (val) => val >= 0.50,
  nfci: (val) => val >= 0.20,
  stlfsi: (val) => val >= 0.50
};

// Global Chart.js defaults to strip marker dots everywhere
Chart.defaults.elements.point.radius = 0;
Chart.defaults.elements.point.hoverRadius = 4;
Chart.defaults.elements.point.hitRadius = 10;

document.addEventListener('DOMContentLoaded', () => {
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

/* ==========================================
   FRED Data Processing & Value Extraction
   ========================================== */

/**
 * Searches backward from the latest observation to locate the newest valid numeric point.
 * Solves publication lag discrepancies between daily, weekly, and monthly series.
 */
function getLatestValidPoint(observations) {
  if (!Array.isArray(observations)) return null;

  for (let i = observations.length - 1; i >= 0; i--) {
    const rawVal = observations[i]?.value;
    if (rawVal !== undefined && rawVal !== null && rawVal !== '.' && !isNaN(parseFloat(rawVal))) {
      return {
        value: parseFloat(rawVal),
        date: observations[i].date
      };
    }
  }
  return null;
}

/**
 * Parses and filters observation arrays into clean numerical series for Chart.js.
 */
function cleanSeriesData(observations) {
  if (!Array.isArray(observations)) return [];

  return observations
    .filter(obs => obs.value !== '.' && obs.value !== null && obs.value !== undefined)
    .map(obs => ({
      x: obs.date,
      y: parseFloat(obs.value)
    }));
}

async function fetchFredSeries(seriesId) {
  // Queries last 1-year window of data
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=asc`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API error (${response.status}) for series: ${seriesId}`);
  }

  const data = await response.json();
  return data.observations || [];
}

/* ==========================================
   Dashboard Load & Render Core Logic
   ========================================== */

async function loadDashboardData() {
  updateBanner('Fetching macroeconomic series from FRED...', 'info');

  const seriesData = {};
  const fetchPromises = Object.entries(SERIES_IDS).map(async ([key, seriesId]) => {
    try {
      const obs = await fetchFredSeries(seriesId);
      seriesData[key] = obs;
    } catch (err) {
      console.error(`Failed to load ${key}:`, err);
      seriesData[key] = [];
    }
  });

  await Promise.all(fetchPromises);

  // Evaluate individual values and compute systemic score
  let totalRiskScore = 0;
  let activeIndicators = 0;

  // Process core indicators
  const indicators = ['vix', 'yield_curve', 'credit_spread', 'sahm_rule', 'nfci', 'stlfsi'];
  
  indicators.forEach((id) => {
    const obs = seriesData[id] || [];
    const unit = (id === 'yield_curve' || id === 'credit_spread' || id === 'sahm_rule') ? '%' : '';
    
    const latest = updateCardValue(id, obs, unit);
    
    if (latest) {
      activeIndicators++;
      const isHighRisk = RISK_THRESHOLDS[id] ? RISK_THRESHOLDS[id](latest.value) : false;
      
      if (isHighRisk) {
        totalRiskScore += 1.5; // Weighted 1.5 per active trigger up to 9
      }
      
      updateIndicatorBadge(id, isHighRisk);
    } else {
      updateIndicatorBadge(id, false, true);
    }

    // Render individual indicator card line charts
    const cleanData = cleanSeriesData(obs);
    renderCardChart(`${id}Chart`, cleanData, isHighRiskColor(id, latest?.value));
  });

  // Process S&P 500 Header Badge
  const sp500Latest = getLatestValidPoint(seriesData.sp500 || []);
  const sp500Badge = document.getElementById('sp500-badge');
  if (sp500Badge && sp500Latest) {
    sp500Badge.textContent = `S&P: ${sp500Latest.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  // Update Overall Systemic Score
  const scoreDisplay = Math.min(Math.round(totalRiskScore), 9);
  updateOverallScore(scoreDisplay);

  // Render Combined Header Chart
  renderCombinedChart(
    cleanSeriesData(seriesData.sp500 || []),
    cleanSeriesData(seriesData.vix || [])
  );

  updateBanner(`Dashboard updated. Active series parsed with localized latest observation dates.`, 'success');
}

/* ==========================================
   DOM & UI Component Updates
   ========================================== */

function updateCardValue(indicatorId, observations, unit = '') {
  const valElement = document.getElementById(`${indicatorId}-val`);
  if (!valElement) return null;

  const latest = getLatestValidPoint(observations);

  if (latest) {
    // Format YYYY-MM-DD into short month and day (e.g., Aug 14)
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
    badge.className = 'text-xs font-bold px-2 py-1 rounded border bg-slate-800 text-slate-500 border-slate-700';
    badge.textContent = 'Status: N/A';
    return;
  }

  if (isHighRisk) {
    badge.className = 'text-xs font-bold px-2 py-1 rounded border bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
    badge.textContent = 'HIGH RISK';
  } else {
    badge.className = 'text-xs font-bold px-2 py-1 rounded border bg-emerald-950 text-emerald-300 border-emerald-800';
    badge.textContent = 'NORMAL';
  }
}

function updateOverallScore(score) {
  const badge = document.getElementById('overall-score-badge');
  if (!badge) return;

  badge.textContent = `Risk: ${score} / 9`;

  if (score >= 6) {
    badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800';
  } else if (score >= 3) {
    badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800';
  } else {
    badge.className = 'text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800';
  }
}

function updateBanner(message, type = 'info') {
  const banner = document.getElementById('risk-banner');
  if (!banner) return;

  banner.textContent = message;

  const baseStyles = 'status-banner border p-3 rounded-lg text-sm font-medium transition-all ';
  if (type === 'danger') {
    banner.className = baseStyles + 'bg-rose-950/60 text-rose-200 border-rose-800';
  } else if (type === 'warning') {
    banner.className = baseStyles + 'bg-amber-950/60 text-amber-200 border-amber-800';
  } else if (type === 'success') {
    banner.className = baseStyles + 'bg-slate-900 text-slate-300 border-slate-800';
  } else {
    banner.className = baseStyles + 'bg-slate-900 text-slate-400 border-slate-800';
  }
}

function isHighRiskColor(id, value) {
  if (value === undefined || value === null) return '#38bdf8';
  return RISK_THRESHOLDS[id] && RISK_THRESHOLDS[id](value) ? '#f43f5e' : '#38bdf8';
}

/* ==========================================
   Chart.js Initialization & Rendering
   ========================================== */

function renderCardChart(canvasId, dataPoints, strokeColor = '#38bdf8') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }

  charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dataPoints.map(p => p.x),
      datasets: [{
        data: dataPoints.map(p => p.y),
        borderColor: strokeColor,
        borderWidth: 1.5,
        fill: false,
        tension: 0.2,
        pointRadius: 0,       // Fully disables marker dots
        pointHoverRadius: 4,  // Restores clean hover dot
        pointHitRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          ticks: {
            color: '#64748b',
            font: { size: 9 },
            maxTicksLimit: 4
          }
        }
      }
    }
  });
}

function renderCombinedChart(sp500Data, vixData) {
  const canvas = document.getElementById('combinedChart');
  if (!canvas) return;

  if (charts['combinedChart']) {
    charts['combinedChart'].destroy();
  }

  // Align dates between datasets
  const labels = sp500Data.map(p => p.x);

  charts['combinedChart'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'S&P 500 Index',
          data: sp500Data.map(p => p.y),
          borderColor: '#38bdf8',
          borderWidth: 2,
          yAxisID: 'y_sp500',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'VIX Volatility',
          data: vixData.map(p => p.y),
          borderColor: '#f43f5e',
          borderWidth: 1.5,
          yAxisID: 'y_vix',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#94a3b8', font: { size: 11 } }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { size: 10 }, maxTicksLimit: 8 }
        },
        y_sp500: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(51, 65, 85, 0.4)' },
          ticks: { color: '#38bdf8', font: { size: 10 } }
        },
        y_vix: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#f43f5e', font: { size: 10 } }
        }
      }
    }
  });
}

/* ==========================================
   API Key Modal Events
   ========================================== */

function setupModalEvents() {
  const modal = document.getElementById('key-modal');
  const btnChangeKey = document.getElementById('btn-change-key');
  const btnSaveKey = document.getElementById('btn-save-key');
  const keyInput = document.getElementById('modal-key-input');

  if (btnChangeKey) {
    btnChangeKey.addEventListener('click', () => {
      showKeyModal(true);
    });
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
  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
}
