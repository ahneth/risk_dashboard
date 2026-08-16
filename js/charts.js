import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js/+esm';
Chart.register(...registerables);

export function initChartDefaults() {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = '#334155';
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, sans-serif';
  Chart.defaults.font.size = 11;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.maintainAspectRatio = false;
}

let cardCharts = {};
let combinedChartInstance = null;

export function renderCardChart(canvasId, seriesData, primaryColor = '#38bdf8') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (cardCharts[canvasId]) {
    cardCharts[canvasId].destroy();
  }

  const labels = seriesData.map(pt => pt.x);
  const values = seriesData.map(pt => pt.y);

  cardCharts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Value',
          data: values,
          borderColor: primaryColor,
          backgroundColor: primaryColor + '20',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: true,
          tension: 0.1,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#475569',
          borderWidth: 1,
          padding: 8,
          boxPadding: 4,
          usePointStyle: true,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 5, color: '#64748b' }
        },
        y: {
          type: 'linear',
          grid: { color: '#1e293b' },
          ticks: { color: '#64748b', maxTicksLimit: 4 }
        }
      }
    }
  });
}

export function renderCombinedChart(sp500Data, riskHistoryData) {
  const canvas = document.getElementById('combinedChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (combinedChartInstance) {
    combinedChartInstance.destroy();
  }

  const labels = sp500Data.map(pt => pt.x);
  const spValues = sp500Data.map(pt => pt.y);

  const riskMap = {};
  riskHistoryData.forEach(pt => {
    riskMap[pt.x] = pt.y;
  });

  const alignedRiskValues = labels.map(dateStr => riskMap[dateStr] !== undefined ? riskMap[dateStr] : null);

  combinedChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'S&P 500',
          data: spValues,
          borderColor: '#38bdf8',
          backgroundColor: '#38bdf810',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          label: 'Macro Risk Index',
          data: alignedRiskValues,
          borderColor: '#f43f5e',
          backgroundColor: '#f43f5e10',
          borderWidth: 2,
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
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: '#475569',
          borderWidth: 1,
          padding: 10,
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 12,
            color: '#cbd5e1'
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: { maxTicksLimit: 8, color: '#64748b' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#1e293b' },
          ticks: { color: '#38bdf8' },
          title: { display: true, text: 'S&P 500 Level', color: '#38bdf8' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { display: false },
          ticks: { color: '#f43f5e', min: 0, max: 9 },
          title: { display: true, text: 'Risk Score (0 - 9)', color: '#f43f5e' }
        }
      }
    }
  });
}
