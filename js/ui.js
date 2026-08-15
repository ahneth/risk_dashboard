// js/ui.js

let dataA = [];
let dataB = [];

// Event listeners for file uploads and button clicks
document.getElementById('reconcileBtn').addEventListener('click', () => {
  const selectedKeys = getSelectedKeysFromUI();
  
  // Call pure logic function
  const results = reconcileDatasets(dataA, dataB, selectedKeys);
  
  // Render output to DOM
  displayResultsTable('matchedTable', results.matched);
});

function displayResultsTable(targetElementId, rows) {
  const container = document.getElementById(targetElementId);
  container.innerHTML = ''; // Reset existing table contents
  
  // Dynamic table DOM creation logic here...
}
