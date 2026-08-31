import { SERIES_IDS } from './config.js';
import { getLatestValidPoint, cleanSeriesData, fetchFredSeries } from './fred-api.js';
import { initChartDefaults, renderCardChart, renderCombinedChart } from './charts.js';
import { evaluatePointRisk, calculateAggregateRiskScore, INDICATOR_METRICS } from './risk-engine.js';

let apiKey = localStorage.getItem('fred_api_key') || '';

document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults();
  setupModalEvents();

  if (!apiKey) {
    updateBanner('FRED API key missing. Click API Key Settings to configure.', 'danger');
    showKeyModal(true);
  } else {
    loadDashboardData();
  }
});

async function loadDashboardData() {
  updateBanner('Fetching live macroeconomic data from FRED...', 'info');

  const seriesData = {};
  let successCount = 0;
  let failCount = 0;

  // Process sequentially to prevent proxy rate-limiting (HTTP 429)
  const entries = Object.entries(SERIES_IDS);
  for (const [key, seriesId] of entries) {
    try {
      const obs = await fetchFredSeries(seriesId, apiKey);
      if (obs && obs.length > 0) {
        seriesData[key] = obs;
        successCount++;
      } else {
        seriesData[key] = [];
        failCount++;
      }
    } catch (err) {
      console.error(`Failed loading ${key}:`, err);
      seriesData[key] = [];
      failCount++;
    }
    await new Promise(res => setTimeout(res, 120));
  }

  const latestValues = {};
  const indicators = Object.keys(INDICATOR_METRICS);

  indicators.forEach((id) => {
    const obs = seriesData[id] || [];
    
    let unit = '';
    if (['yield_curve', 'credit_spread', 'bbb_spread', 'sahm_rule', 'ted_spread'].includes(id)) {
      unit = '%';
    } else if (id === 'fed_liquidity') {
      unit = 'M';
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
    
    const indicatorRiskHistory = cleanData.map(pt => ({
      x: pt.x,
      y: evaluatePointRisk(id, pt.y).score0to9
    }));
    
    const altId = id.replace(/_/g, '-');
    const canvasId = document.getElementById(`${id}Chart`) ? `${id}Chart` : `${altId}Chart`;

    renderCardChart(canvasId, cleanData, indicatorRiskHistory);
  });

  const totalScore = calculateAggregateRiskScore(latestValues);
  updateOverallScore(totalScore);

  const sp500Latest = getLatestValidPoint(seriesData.sp500 || []);
  const sp500Badge = document.getElementById('sp500-badge');
  if (sp500Badge && sp500Latest) {
    sp500Badge.textContent = `S&P: ${sp500Latest.value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 24);
  const cutoffTime = cutoffDate.getTime();

  const sp500Clean = cleanSeriesData(seriesData.sp500 || []);
  
  const dateSet = new Set();
  sp500Clean.forEach(pt => {
    if (new Date(`${pt.x}T00:00:00Z`).getTime() >= cutoffTime) {
      dateSet.add(pt.x);
    }
  });
  
  indicators.forEach(id => {
    (seriesData[id] || []).forEach(obs => {
      if (obs.value !== '.' && !isNaN(parseFloat(obs.value))) {
        const obsTime = new Date(`${obs.date}T00:00:00Z`).getTime();
        if (obsTime >= cutoffTime) {
          dateSet.add(obs.date);
        }
      }
    });
  });

  const sortedDates = Array.from(dateSet).sort();
  const seriesMaps = {};
  
  indicators.forEach(id => {
    seriesMaps[id] = {};
    (seriesData[id] || []).forEach(obs => {
      if (obs.value !== '.' && !isNaN(parseFloat(obs.value))) {
        seriesMaps[id][obs.date] = parseFloat(obs.value);
      }
    });
  });

  const consolidatedRiskHistory = [];
  const lastKnownValues = {};

  sortedDates.forEach(dateStr => {
    let hasValues = false;
    indicators.forEach(id => {
      if (seriesMaps[id][dateStr] !== undefined) {
        lastKnownValues[id] = seriesMaps[id][dateStr];
        hasValues = true;
      }
    });

    if (hasValues) {
      const currentPointValues = {};
      indicators.forEach(id => {
        if (lastKnownValues[id] !== undefined) {
          currentPointValues[id] = lastKnownValues[id];
        }
      });

      consolidatedRiskHistory.push({
        x: dateStr,
        y: calculateAggregateRiskScore(currentPointValues)
      });
    }
  });

  const sp500Map = {};
  sp500Clean.forEach(pt => { sp500Map[pt.x] = pt.y; });
  
  let lastSpVal = null;
  const alignedSp500Data = sortedDates.map(dateStr => {
    if (sp500Map[dateStr] !== undefined) {
      lastSpVal = sp500Map[dateStr];
    }
    return { x: dateStr, y: lastSpVal };
  }).filter(pt => pt.y !== null);

  renderCombinedChart(alignedSp500Data, consolidatedRiskHistory);

  if (successCount > 0 && failCount === 0) {
    updateBanner(`Dashboard successfully synchronized with live FRED data feeds (${successCount}/${successCount + failCount} series live).`, 'success');
  } else if (successCount > 0 && failCount > 0) {
    updateBanner(`Partial sync: ${successCount} loaded, ${failCount} failed. Check CORS proxy or API status.`, 'warning');
  } else {
    updateBanner(`Sync failed: 0 of ${failCount} indicators fetched. Check your API key or proxy status.`, 'danger');
  }
}

function updateCardValue(indicatorId, observations, unit = '') {
  const altId = indicatorId.replace(/_/g, '-');
  const valElement = document.getElementById(`${indicatorId}-val`) || document.getElementById(`${altId}-val`);
  
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
  const altId = indicatorId.replace(/_/g, '-');
  const badge = document.getElementById(`${indicatorId}-score-badge`) || 
                document.getElementById(`${altId}-score-badge`);
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
