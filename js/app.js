// Version: 2.0.1 | Last Modified: 2026-11-23 09:38 HKT
/*
  File: js/app.js
  Description: Main frontend controller. Loads cached FRED data, dynamically renders
               Tier 1 (Fast Shock) and Tier 2 (Structural Macro) indicator cards,
               computes historical dual-speed risk series, and manages timeframe filters.
  Change Log:
    - 2.0.1 (2026-11-23 09:38 HKT): Version sync for standalone GitHub repository package.
    - 2.0.0 (2026-11-23 08:41 HKT): Replaced hardcoded HTML cards with dynamic rendering,
      added Shock Override alert banner, timeframe selector (3M/6M/1Y/2Y), and
      Last Updated metadata display.
    - 1.0.0 (2026-08-01 00:00 HKT): Initial dashboard controller.
*/

import { RISK_CONFIG } from './config.js';
import { fetchFredSeries, getCacheMeta, cleanSeriesData } from './fred-api.js';
import { initChartDefaults, renderCardChart, renderCombinedChart } from './charts.js';
import { INDICATOR_METRICS, evaluateSeriesPoint, calculateDualSpeedRisk } from './risk-engine.js';

let activeMonths = RISK_CONFIG.DEFAULT_TIMEFRAME_MONTHS;
let cachedCleanSeries = {};
let cachedRiskHistories = {};
let cachedTimeline = { sp500: [], composite: [], shock: [] };

document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults();
  setupTimeframeButtons();
  loadDashboardData();
});

function setupTimeframeButtons() {
  const buttons = document.querySelectorAll('.tf-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      activeMonths = parseInt(btn.dataset.months, 10);
      buttons.forEach(b => {
        b.className = 'tf-btn px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition';
      });
      btn.className = 'tf-btn px-2.5 py-1 rounded-md bg-indigo-600 text-white transition';
      renderAllChartsForTimeframe(activeMonths);
    });
  });
}

function sliceByMonths(points, months) {
  if (!points || points.length === 0) return [];
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return points.filter(pt => pt.x >= cutoffStr);
}

async function loadDashboardData() {
  updateBanner('Loading FRED market shock & macro cache...', 'info');

  const meta = await getCacheMeta();
  const updatedEl = document.getElementById('last-updated-text');
  if (updatedEl) {
    updatedEl.textContent = meta?.updatedAt
      ? `Cache Updated: ${new Date(meta.updatedAt).toLocaleString()}`
      : 'FRED Static Cache Mode (Awaiting First Sync)';
  }

  const indicators = Object.keys(INDICATOR_METRICS);
  let loadedCount = 0;

  for (const id of indicators) {
    const raw = await fetchFredSeries(id);
    const clean = cleanSeriesData(raw);
    cachedCleanSeries[id] = clean;
    if (clean.length > 0) loadedCount++;
  }

  if (loadedCount === 0) {
    updateBanner('Cache empty. Go to GitHub Actions -> "Update FRED Data Cache" -> Run workflow to populate data/fred_cache.json.', 'danger');
    return;
  }

  const fastGrid = document.getElementById('fast-indicators-grid');
  const slowGrid = document.getElementById('slow-indicators-grid');
  fastGrid.innerHTML = '';
  slowGrid.innerHTML = '';

  const latestScores = {};

  indicators.forEach(id => {
    const metric = INDICATOR_METRICS[id];
    const pts = cachedCleanSeries[id];
    const riskHistory = pts.map((pt, idx) => ({
      x: pt.x,
      y: evaluateSeriesPoint(id, pts, idx).score0to9
    }));
    cachedRiskHistories[id] = riskHistory;

    const latestIdx = pts.length - 1;
    const latestPt = latestIdx >= 0 ? pts[latestIdx] : null;
    const latestEval = latestIdx >= 0 ? evaluateSeriesPoint(id, pts, latestIdx) : { score0to9: 0, status: 'N/A', subText: '' };

    if (latestPt) {
      latestScores[id] = latestEval.score0to9;
    }

    const cardHtml = buildIndicatorCardHTML(id, metric, latestPt, latestEval);
    if (metric.tier === 'fast') {
      fastGrid.insertAdjacentHTML('beforeend', cardHtml);
    } else {
      slowGrid.insertAdjacentHTML('beforeend', cardHtml);
    }
  });

  updateIndexBadge('sp500-badge', 'S&P 500', cachedCleanSeries.sp500_dd);
  updateIndexBadge('nasdaq-badge', 'NASDAQ', cachedCleanSeries.nasdaq_dd);

  const summary = calculateDualSpeedRisk(latestScores);
  updateHeaderBadges(summary);

  buildConsolidatedTimeline(indicators);
  renderAllChartsForTimeframe(activeMonths);

  if (summary.shockOverride) {
    const triggers = summary.redFastIds.length > 0 ? summary.redFastIds.join(', ') : 'Elevated Fast Shock Sub-Score';
    updateBanner(
      `SYSTEM SHOCK ALERT (Score ${summary.composite} / 9.0): Near-term stress override active! Triggered by: ${triggers}.`,
      'danger'
    );
  } else if (summary.composite >= 5.0) {
    updateBanner(
      `ELEVATED RISK (${summary.composite} / 9.0): Market shock sensors (${summary.fastScore}) and macro regime (${summary.slowScore}) warrant caution.`,
      'warning'
    );
  } else {
    updateBanner(
      `SYSTEM NORMAL (${summary.composite} / 9.0): ${loadedCount}/${indicators.length} FRED indicators synced. No active near-term shock detected.`,
      'success'
    );
  }
}

function buildIndicatorCardHTML(id, metric, latestPt, evalObj) {
  const score = evalObj.score0to9;
  const badgeClass = score >= 7.0
    ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
    : score >= 4.0
      ? 'bg-amber-950 text-amber-300 border-amber-800'
      : 'bg-emerald-950 text-emerald-300 border-emerald-800';

  let valDisplay = 'N/A';
  let dateDisplay = '';
  if (latestPt) {
    if (metric.unit === 'T') {
      valDisplay = `$${(latestPt.y / 1000000).toFixed(2)}T`;
    } else if (metric.unit === 'index') {
      valDisplay = latestPt.y.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
      valDisplay = `${latestPt.y.toFixed(2)}${metric.unit}`;
    }
    const dObj = new Date(`${latestPt.x}T00:00:00Z`);
    dateDisplay = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  const legendBadges = metric.legend.map((txt, i) => {
    const cls = i === 0
      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-900'
      : i === 1
        ? 'bg-amber-950/70 text-amber-300 border-amber-900'
        : 'bg-rose-950/70 text-rose-300 border-rose-900';
    return `<span class="px-1.5 py-0.5 rounded border ${cls}">${txt}</span>`;
  }).join('');

  return `
    <div class="bg-cardbg border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
      <div>
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 truncate">${metric.name}</span>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${badgeClass}">
            ${latestPt ? `RISK: ${score.toFixed(1)}` : 'N/A'}
          </span>
        </div>
        <div class="flex items-baseline justify-between mb-1">
          <div class="text-2xl font-black text-white">
            ${valDisplay}
            <span class="text-xs font-normal text-slate-400 ml-1">${dateDisplay ? `(${dateDisplay})` : ''}</span>
          </div>
          <span class="text-xs font-semibold ${score >= 7 ? 'text-rose-400' : score >= 4 ? 'text-amber-400' : 'text-emerald-400'}">
            ${evalObj.status}
          </span>
        </div>
        <div class="text-[11px] font-mono text-slate-400 mb-2">${evalObj.subText || '&nbsp;'}</div>
        <p class="text-[11px] text-slate-400 mb-2 leading-relaxed">${metric.description}</p>
        <div class="flex flex-wrap gap-1 text-[10px] font-medium pt-1.5 border-t border-slate-800/80 mb-2">
          ${legendBadges}
        </div>
      </div>
      <div class="relative h-32 w-full mt-1">
        <canvas id="${id}Chart"></canvas>
      </div>
    </div>
  `;
}

function buildConsolidatedTimeline(indicators) {
  const spPts = cachedCleanSeries.sp500_dd || [];
  const dates = spPts.map(pt => pt.x);

  const riskMaps = {};
  indicators.forEach(id => {
    riskMaps[id] = {};
    (cachedRiskHistories[id] || []).forEach(pt => {
      riskMaps[id][pt.x] = pt.y;
    });
  });

  const lastKnownScores = {};
  const composite = [];
  const shock = [];

  dates.forEach(dateStr => {
    indicators.forEach(id => {
      if (riskMaps[id][dateStr] !== undefined) {
        lastKnownScores[id] = riskMaps[id][dateStr];
      }
    });
    const res = calculateDualSpeedRisk(lastKnownScores);
    composite.push({ x: dateStr, y: res.composite });
    shock.push({ x: dateStr, y: res.fastScore });
  });

  cachedTimeline = { sp500: spPts, composite, shock };
}

function renderAllChartsForTimeframe(months) {
  renderCombinedChart(
    sliceByMonths(cachedTimeline.sp500, months),
    sliceByMonths(cachedTimeline.composite, months),
    sliceByMonths(cachedTimeline.shock, months)
  );

  Object.keys(INDICATOR_METRICS).forEach(id => {
    renderCardChart(
      `${id}Chart`,
      sliceByMonths(cachedCleanSeries[id], months),
      sliceByMonths(cachedRiskHistories[id], months)
    );
  });
}

function updateIndexBadge(elId, label, pts) {
  const el = document.getElementById(elId);
  if (!el || !pts || pts.length === 0) return;
  const latest = pts[pts.length - 1].y;
  el.textContent = `${label}: ${latest.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function updateHeaderBadges({ composite, fastScore, slowScore, shockOverride }) {
  const styleFor = (s) => s >= 6.5
    ? 'bg-rose-950 text-rose-300 border-rose-700'
    : s >= 4.0
      ? 'bg-amber-950 text-amber-300 border-amber-700'
      : 'bg-emerald-950 text-emerald-300 border-emerald-700';

  const shockEl = document.getElementById('shock-score-badge');
  const macroEl = document.getElementById('macro-score-badge');
  const totalEl = document.getElementById('overall-score-badge');

  if (shockEl) {
    shockEl.className = `text-xs font-bold px-3 py-1 rounded-full border ${styleFor(fastScore)}`;
    shockEl.textContent = `Shock: ${fastScore.toFixed(1)} / 9.0`;
  }
  if (macroEl) {
    macroEl.className = `text-xs font-bold px-3 py-1 rounded-full border ${styleFor(slowScore)}`;
    macroEl.textContent = `Macro: ${slowScore.toFixed(1)} / 9.0`;
  }
  if (totalEl) {
    totalEl.className = `text-xs font-bold px-3 py-1 rounded-full border ${styleFor(composite)} ${shockOverride ? 'animate-pulse' : ''}`;
    totalEl.textContent = `Total Risk: ${composite.toFixed(1)} / 9.0`;
  }
}

function updateBanner(message, type = 'info') {
  const banner = document.getElementById('risk-banner');
  if (!banner) return;
  banner.textContent = message;
  const base = 'border p-4 rounded-xl text-sm font-semibold transition-all ';
  if (type === 'danger') banner.className = base + 'bg-rose-950/70 text-rose-200 border-rose-700';
  else if (type === 'warning') banner.className = base + 'bg-amber-950/60 text-amber-200 border-amber-700';
  else if (type === 'success') banner.className = base + 'bg-slate-900 text-emerald-300 border-emerald-900/60';
  else banner.className = base + 'bg-slate-900 text-slate-400 border-slate-800';
}
