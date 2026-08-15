import { RISK_THRESHOLDS } from './config.js';

export function evaluateRiskRegime(latestMetrics) {
  let redCount = 0;
  let yellowCount = 0;

  const evaluatedFactors = Object.entries(latestMetrics).map(([factor, value]) => {
    const limits = RISK_THRESHOLDS[factor];
    let status = 'GREEN';
    
    if (limits && value >= limits.red) {
      status = 'RED';
      redCount++;
    } else if (limits && value >= limits.yellow) {
      status = 'YELLOW';
      yellowCount++;
    }

    return { factor, value, status };
  });

  const overallRegime = redCount >= 2 ? 'RED' : (yellowCount >= 2 ? 'YELLOW' : 'GREEN');
  return { overallRegime, evaluatedFactors };
}
