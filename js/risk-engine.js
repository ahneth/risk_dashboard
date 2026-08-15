// js/risk-engine.js

export const FACTOR_WEIGHTS = {
  VIX: 0.20,
  YIELD_CURVE: 0.20,
  CREDIT_SPREAD: 0.20,
  SAHM_RULE: 0.15,
  NFCI: 0.15,
  BREADTH: 0.10
};

/**
 * Maps raw metric values to an integer 0 - 9 Risk Score scale.
 * 0-3: Low (Green), 4-6: Amber (Moderate), 7-9: Red (High/Extreme)
 */
export function calculateFactorRiskScore(key, rawValue) {
  if (rawValue === undefined || rawValue === null || isNaN(rawValue)) return 4;

  let score = 0;
  switch (key) {
    case 'VIX':
      // VIX: <=12 is 0, >=35 is 9
      score = ((rawValue - 12) / (35 - 12)) * 9;
      break;
    case 'YIELD_CURVE':
      // Spread: >=0.75% is 0 (healthy), <=-0.75% is 9 (inverted)
      score = ((0.75 - rawValue) / (0.75 - (-0.75))) * 9;
      break;
    case 'CREDIT_SPREAD':
      // HY Spread: <=3.0% is 0, >=7.0% is 9
      score = ((rawValue - 3.0) / (7.0 - 3.0)) * 9;
      break;
    case 'SAHM_RULE':
      // Sahm: 0.0 is 0, >=0.5 is 9 (recession trigger)
      score = (rawValue / 0.5) * 9;
      break;
    case 'NFCI':
      // NFCI: <=-0.5 is 0 (loose), >=0.5 is 9 (tight)
      score = ((rawValue - (-0.5)) / (0.5 - (-0.5))) * 9;
      break;
    case 'BREADTH':
      // Breadth: >=75% is 0, <=35% is 9
      score = ((75 - rawValue) / (75 - 35)) * 9;
      break;
    default:
      score = 4;
  }

  return Math.min(9, Math.max(0, Math.round(score)));
}

/**
 * Returns color metadata and Tailwind classes based on 0-9 risk score.
 */
export function getRiskColorMeta(score) {
  if (score <= 3) {
    return {
      label: 'LOW',
      hex: '#10b981', // Green
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      bannerClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
    };
  } else if (score <= 6) {
    return {
      label: 'MODERATE',
      hex: '#f59e0b', // Amber
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      bannerClass: 'bg-amber-950/80 text-amber-400 border-amber-800/50'
    };
  } else {
    return {
      label: 'HIGH / EXTREME',
      hex: '#ef4444', // Red
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      bannerClass: 'bg-rose-950/80 text-rose-400 border-rose-800/50'
    };
  }
}

/**
 * Computes historical weighted composite scores (0-9) and overall regime status.
 */
export function evaluateRiskRegime(dataset) {
  const keys = Object.keys(FACTOR_WEIGHTS);
  const minLength = Math.min(...keys.map(k => (dataset[k] ? dataset[k].length : 0)));

  if (minLength === 0) {
    return { compositeScore: 0, overallRegime: 'N/A', compositeHistory: [] };
  }

  const compositeHistory = [];

  for (let i = 0; i < minLength; i++) {
    let weightedSum = 0;
    let totalWeight = 0;
    const date = dataset[keys[0]][i].date;

    keys.forEach(key => {
      const rawVal = dataset[key][i].value;
      const weight = FACTOR_WEIGHTS[key];
      const factorScore = calculateFactorRiskScore(key, rawVal);

      weightedSum += factorScore * weight;
      totalWeight += weight;
    });

    const compositeScore = +(weightedSum / totalWeight).toFixed(1);
    compositeHistory.push({ date, value: compositeScore });
  }

  const latestComposite = compositeHistory[compositeHistory.length - 1]?.value || 0;
  const roundedLatest = Math.round(latestComposite);
  const meta = getRiskColorMeta(roundedLatest);

  return {
    compositeScore: latestComposite,
    roundedScore: roundedLatest,
    overallRegime: meta.label,
    compositeHistory
  };
}
