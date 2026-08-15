// js/charts.js
import { getRiskColorMeta } from './risk-engine.js';

const chartInstances = {};

/**
 * Renders the primary Overall Composite Risk Score Chart (0 - 9).
 */
export function renderOverallChart(canvasId, compositeHistory) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const labels = compositeHistory.map(p => p.date);
  const values = compositeHistory.map(p => p.value);
  const latestScore = Math.round(values[values.length - 1] || 0);
  const colorMeta = getRiskColorMeta(latestScore);

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Overall Risk Score (0-9)',
        data: values,
        borderColor: colorMeta.hex,
        backgroundColor: `${colorMeta.hex}22`,
        fill: true,
        borderWidth: 3,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Overall Risk Score: ${ctx.parsed.y} / 9`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        y: {
          min: 0,
          max: 9,
          ticks: { stepSize: 1, color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

/**
 * Renders individual factor charts with dual Y-axes (Raw Metric + 0-9 Risk Score).
 */
export function renderMarkerChart(canvasId, title, dataPoints) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const labels = dataPoints.map(p => p.date);
  const rawValues = dataPoints.map(p => p.value);
  const riskScores = dataPoints.map(p => p.riskScore);
  const latestRiskScore = riskScores[riskScores.length - 1] || 0;
  const colorMeta = getRiskColorMeta(latestRiskScore);

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Raw Value',
          data: rawValues,
          borderColor: '#6366f1', // Indigo for raw metric
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'Risk Score (0-9)',
          data: riskScores,
          borderColor: colorMeta.hex, // Green, Amber, or Red
          borderDash: [4, 4],
          borderWidth: 2,
          stepped: true,
          pointRadius: 2,
          yAxisID: 'y1'
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
          labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 }
        }
      },
      scales: {
        x: { display: false },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#818cf8', font: { size: 9 } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 9,
          ticks: { stepSize: 3, color: colorMeta.hex, font: { size: 9 } },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}
