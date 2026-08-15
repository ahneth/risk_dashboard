const chartInstances = {};

export function renderTrendChart(canvasId, label, historicalData) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: historicalData.map(d => d.date),
      datasets: [{
        label,
        data: historicalData.map(d => d.value),
        borderColor: '#2563eb',
        tension: 0.1
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}
