const charts = {};

export function initChartDefaults() {
  if (typeof Chart !== 'undefined') {
    Chart.defaults.elements.point.radius = 0;
    Chart.defaults.elements.point.hoverRadius = 4;
    Chart.defaults.elements.point.hitRadius = 10;
  }
}

export function renderCardChart(canvasId, dataPoints, riskPoints, strokeColor = '#38bdf8') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) {
    charts[canvasId].destroy();
  }

  charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dataPoints.map(p => p.x),
      datasets: [
        {
          label: 'Indicator Value',
          data: dataPoints.map(p => p.y),
          borderColor: strokeColor,
          borderWidth: 1.5,
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          label: 'Risk Score (0 or 1.5)',
          data: riskPoints.map(p => p.y),
          borderColor: '#f43f5e',
          borderWidth: 1,
          borderDash: [3, 3], // Dashed line for clarity
          fill: false,
          stepped: true, // Step line to show clean 0.0 -> 1.5 threshold transitions
          pointRadius: 0,
          yAxisID: 'y_score'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(51, 65, 85, 0.3)' },
          ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 4 }
        },
        y_score: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 2,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#f43f5e',
            font: { size: 8 },
            stepSize: 1.5,
            callback: (val) => val === 1.5 ? '1.5pt' : (val === 0 ? '0pt' : '')
          }
        }
      }
    }
  });
}

export function renderCombinedChart(sp500Data, vixData) {
  const canvas = document.getElementById('combinedChart');
  if (!canvas) return;

  if (charts['combinedChart']) {
    charts['combinedChart'].destroy();
  }

  charts['combinedChart'] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: sp500Data.map(p => p.x),
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
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, labels: { color: '#94a3b8', font: { size: 11 } } }
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
