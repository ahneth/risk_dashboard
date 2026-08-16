import { SERIES_IDS } from './config.js';
import { getLatestValidPoint, cleanSeriesData, fetchFredSeries } from './fred-api.js';
import { initChartDefaults, renderCardChart, renderCombinedChart } from './charts.js';
import { evaluatePointRisk, calculateAggregateRiskScore, INDICATOR_METRICS } from './risk-engine.js';

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

  const latestValues = {};
  const indicators = Object.keys(INDICATOR_METRICS);

  indicators.forEach((id) => {
    const obs = seriesData[id] || [];
    
    // Determine appropriate unit formatting
    let unit = '';
    if (['yield_curve', 'credit_spread', 'bbb_spread', 'sahm_rule', 'ted_spread'].includes(id)) {
      unit = '%';
    } else if (id === 'fed_liquidity') {
      unit = 'M'; // Millions (FRED WALCL scale)
    }

    const latest = updateCardValue(id, obs, unit);
    if (latest) {
      latestValues[id] = latest.value;
      const { score0to9 } = evaluatePointRisk(id, latest.value);
      updateIndicatorBadge(id, score0to9);
    } else {
      updateIndicatorBadge(id, 0, true);
    }

    const cleanData = cleanSeriesData(obs);

    const riskTrend = cleanData.map(pt => ({
      x: pt.x,
      y: evaluatePointRisk(id, pt.y).score0to9
    }));

    const currentScore = latestValues[id] !== undefined ? evaluatePointRisk(id, latestValues[id]).score0to9 : 0;
    renderCardChart(`${id}Chart`, cleanData, riskTrend, currentScore >= 6.0 ? '#f43f5e' : '#38bdf8');
  });

  // Calculate weighted total risk score out of 9.0 for current state
  const totalScore = calculateAggregateRiskScore(latestValues);
  updateOverallScore(totalScore);

  const sp500Latest = getLatestValidPoint(seriesData.sp500 || []);
  const sp500Badge = document.getElementById('sp500-badge');
  if (sp500Badge && sp500Latest) {
    sp500Badge.textContent = `S&P: ${sp500Latest.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  // Build historical consolidated risk score timeline mapped by date matching S&P 500 dates
  const sp500Clean = cleanSeriesData(seriesData.sp500 || []);
  
  const dateValueMaps = {};
  indicators.forEach(id => {
    dateValueMaps[id] = {};
    (seriesData[id] || []).forEach(obs => {
      if (obs.value !== '.' && !isNaN(parseFloat(obs.value))) {
        dateValueMaps[id][obs.date] = parseFloat(obs.value);
      }
    });
  });

  const consolidatedRiskHistory = sp500Clean.map(pt => {
    const dateStr = pt.x;
    const currentPointValues = {};
    
    indicators.forEach(id => {
      if (dateValueMaps[id][dateStr] !== undefined) {
        currentPointValues[id] = dateValueMaps[id][dateStr];
      }
    });

    return {
      x: dateStr,
      y: calculateAggregateRiskScore(currentPointValues)
    };
  });

  renderCombinedChart(sp500Clean, consolidatedRiskHistory);

  updateBanner('Dashboard updated successfully with 10 macro indicators.', 'success');
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

    let displayVal = latest.value.toFixed(2);
    if (unit === 'M') {
      // Convert millions to trillions for clean readable layout (e.g. $7.24T)
      displayVal = `$${(latest.value / 1000000).toFixed(2)}T`;
      unit = '';
    }

    valElement.innerHTML = `
      ${displayVal}${unit}
      <span class="text-xs font-normal text-slate-400 block sm:inline sm:ml-1">
        (${formattedDate})
      </span>
    `;
  } else {
    valElement.textContent = 'N/A';
  }

  return latest;
}

function updateIndicatorBadge(indicatorId, score0to9 = 0, isMissing = false) {
  const badge = document.getElementById(`${indicatorId}-score-badge`) ||
                document.getElementById(`${indicatorId.replace('_', '-')}-score-badge`);
  if (!badge) return;

  if (isMissing) {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-slate-800 text-slate-500 border-slate-700';
    badge.textContent = 'SCORE: N/A';
    return;
  }

  const formattedScore = score0to9.toFixed(1);

  if (score0to9 >= 6.0) {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-rose-950 text-rose-300 border-rose-800 animate-pulse';
    badge.textContent = `RISK: ${formattedScore} / 9.0`;
  } else if (score0to9 >= 3.0) {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-amber-950 text-amber-300 border-amber-800';
    badge.textContent = `RISK: ${formattedScore} / 9.0`;
  } else {
    badge.className = 'text-xs font-bold px-2 py-0.5 rounded border bg-emerald-950 text-emerald-300 border-emerald-800';
    badge.textContent = `RISK: ${formattedScore} / 9.0`;
  }
}

function updateOverallScore(score) {
  const badge = document.getElementById('overall-score-badge');
  if (!badge) return;

  badge.textContent = `Total Risk: ${score} / 9.0`;

  const numericScore = parseFloat(score);
  if (numericScore >= 6.0) {
    badge.className = 'text-xs font-bold px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-800';
  } else if (numericScore >= 3.0) {
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
