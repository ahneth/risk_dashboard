// Version: 2.0.1 | Last Modified: 2026-11-23 09:38 HKT
/*
  File: js/charts.js
  Description: Chart.js rendering module for individual indicator cards and the
               consolidated S&P 500 vs Composite Risk / Near-Term Shock chart.
  Change Log:
    - 2.0.1 (2026-11-23 09:38 HKT): Version sync for standalone GitHub repository package.
    - 2.0.0 (2026-11-23 08:41 HKT): Added 3rd dataset (Near-Term Shock Index dashed line) to
      the consolidated chart and dynamic timeframe slicing support.
    - 1.0.0 (2026-08-01 00:00 HKT): Initial Chart.js rendering setup.
*/

import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js/+esm';
Chart.register(...registerables);

const cardCharts = {};
let combinedChartInstance = null;

/**
 * Sets global Chart.js dark-mode visual defaults.
 */
export function initChartDefaults() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = '#334155';
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.maintainAspectRatio = false;
}

/**
 * Renders a dual-axis mini line chart inside an individual indicator card.
 */
export function renderCardChart(canvasId, seriesData, riskScoreHistory = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (cardCharts[canvasId]) {
    cardCharts[canvasId].destroy();
  }

  const labels = seriesData.map(pt => pt.x);
  const values = seriesData.map(pt => pt.y);

  const riskMap = {};
  riskScoreHistory.forEach(pt => { riskMap[pt.x] = pt.y; });
  const alignedRisk = labels.map(d => (riskMap[d] !== undefined ? riskMap[d] : null));

  cardCharts[canvasId] = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Value',
          data: values,
          borderColor: '#38bdf8',
          backgroundColor: '#38bdf812',
          borderWidth: 1.8,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: true,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Risk (0-9)',
          data: alignedRisk,
          borderColor: '#f43f5e',
          backgroundColor: 'transparent',
          borderWidth: 1.6,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: false,
          tension: 0.1,
          yAxisID: 'y1',
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 8
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 4, color: '#64748b' } },
        y: { type: 'linear', position: 'left', grid: { color: '#1e293b' }, ticks: { color: '#38bdf8', maxTicksLimit: 4 } },
        y1: { type: 'linear', position: 'right', grid: { display: false }, min: 0, max: 9, ticks: { color: '#f43f5e', stepSize: 3 } }
      }
    }
  });
}

/**
 * Renders the main consolidated chart comparing S&P 500 against Composite Risk & Fast Shock Index.
 */
export function renderCombinedChart(sp500Data, compositeHistory, shockHistory) {
  const canvas = document.getElementById('combinedChart');
  if (!canvas) return;

  if (combinedChartInstance) {
    combinedChartInstance.destroy();
  }

  const labels = sp500Data.map(pt => pt.x);
  const spValues = sp500Data.map(pt => pt.y);

  const compMap = {};
  compositeHistory.forEach(pt => { compMap[pt.x] = pt.y; });
  const shockMap = {};
  shockHistory.forEach(pt => { shockMap[pt.x] = pt.y; });

  const alignedComp = labels.map(d => (compMap[d] !== undefined ? compMap[d] : null));
  const alignedShock = labels.map(d => (shockMap[d] !== undefined ? shockMap[d] : null));

  combinedChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'S&P 500',
          data: spValues,
          borderColor: '#38bdf8',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Composite Risk (0–9)',
          data: alignedComp,
          borderColor: '#f43f5e',
          backgroundColor: '#f43f5e15',
          borderWidth: 2.2,
          pointRadius: 0,
          fill: true,
          tension: 0.1,
          yAxisID: 'y1',
          spanGaps: true
        },
        {
          label: 'Near-Term Shock (Fast)',
          data: alignedShock,
          borderColor: '#fbbf24',
          borderDash: [4, 4],
          borderWidth: 1.8,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          yAxisID: 'y1',
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 10
        },
        legend: {
          display: true,
          position: 'top',
          labels: { boxWidth: 12, color: '#cbd5e1' }
        }
      },
      scales: {
        x: { grid: { color: '#1e293b' }, ticks: { maxTicksLimit: 8, color: '#64748b' } },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: '#1e293b' },
          ticks: { color: '#38bdf8' },
          title: { display: true, text: 'S&P 500', color: '#38bdf8' }
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          min: 0,
          max: 9,
          ticks: { color: '#f43f5e', stepSize: 3 },
          title: { display: true, text: 'Risk Score (0–9)', color: '#f43f5e' }
        }
      }
    }
  });
}
