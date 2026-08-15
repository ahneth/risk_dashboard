// js/risk-engine.js

export const FACTOR_WEIGHTS = {
  VIX: 0.20,
  YIELD_CURVE: 0.20,
  CREDIT_SPREAD: 0.20,
  SAHM_RULE: 0.15,
  NFCI: 0.15,
  BREADTH: 0.10
};

export function calculateFactorRiskScore(key, rawValue) {
  if (rawValue === undefined || rawValue === null || isNaN(rawValue)) return 4;

  let score = 0;
  switch (key) {
    case 'VIX':
      score = ((rawValue - 12) / (35 - 12)) * 9;
      break;
    case 'YIELD_CURVE':
      score = ((0.75 - rawValue) / (0.75 - (-0.75))) * 9;
      break;
    case 'CREDIT_SPREAD':
      score = ((rawValue - 3.0) / (7.0 - 3.0)) * 9;
      break;
    case 'SAHM_RULE':
      score = (rawValue / 0.5) * 9;
      break;
    case 'NFCI':
      score = ((rawValue - (-0.5)) / (0.5 - (-0.5))) * 9;
      break;
    case 'BREADTH':
      score = ((75 - rawValue) / (75 - 35)) * 9;
      break;
    default:
      score = 4;
  }

  return Math.min(9, Math.max(0, Math.round(score)));
}

export function getRiskColorMeta(score) {
  if (score <= 3) {
    return {
      label: 'LOW',
      hex: '#10b981',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      bannerClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
    };
  } else if (score <= 6) {
    return {
      label: 'MODERATE',
      hex: '#f59e0b',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      bannerClass: 'bg-amber-950/80 text-amber-400 border-amber-800/50'
    };
  } else {
    return {
      label: 'HIGH / EXTREME',
      hex: '#ef4444',
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      bannerClass: 'bg-rose-950/80 text-rose-400 border-rose-800/50'
    };
  }
}

/**
 * Computes composite monthly scores across all 24 months.
 */
export function evaluateRiskRegime(dataset) {
  const keys = Object.keys(FACTOR_WEIGHTS);
  
  // Align timeline to anchor series (VIX)
  const anchorSeries = dataset['VIX'] || dataset[keys[0]] || [];
  if (anchorSeries.length === 0) {
    return { compositeScore: 0, roundedScore: 0, overallRegime: 'N/A', compositeHistory: [] };
  }

  const compositeHistory = [];

  anchorSeries.forEach((anchorPoint, idx) => {
    let weightedSum = 0;
    let totalWeight = 0;

    keys.forEach(key => {
      const series = dataset[key] || [];
      const point = series[idx] || series[series.length - 1];

      const rawVal = point ? point.value : undefined;
      const weight = FACTOR_WEIGHTS[key];
      const factorScore = calculateFactorRiskScore(key, rawVal);

      weightedSum += factorScore * weight;
      totalWeight += weight;
    });

    const compositeScore = +(weightedSum / totalWeight).toFixed(1);
    compositeHistory.push({ date: anchorPoint.date, value: compositeScore });
  });

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
