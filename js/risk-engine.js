// js/risk-engine.js
import { RISK_THRESHOLDS } from './config.js';

// Define factor weights (Must sum to 1.0)
const FACTOR_WEIGHTS = {
  VIX: 0.20,           // Equity Volatility (20%)
  YIELD_CURVE: 0.20,   // Recession Signal (20%)
  CREDIT_SPREAD: 0.20, // Corporate Credit Stress (20%)
  SAHM_RULE: 0.15,     // Labor Market Stress (15%)
  NFCI: 0.15,          // Financial Conditions (15%)
  BREADTH: 0.10        // Equity Market Participation (10%)
};

/**
 * Normalizes a raw metric value to a 0 - 100 Risk Score.
 * 0 = Lowest Risk, 100 = Maximum Risk / Extreme Stress.
 */
function calculateFactorRiskScore(key, rawValue) {
  if (rawValue === undefined || rawValue === null || isNaN(rawValue)) {
    return 50; // Neutral score for missing data
  }

  const thresholds = RISK_THRESHOLDS[key];
  if (!thresholds) return 50;

  switch (key) {
    case 'VIX':
      // Higher is riskier
      if (rawValue <= 15) return 10;
      if (rawValue >= thresholds.red) return 100;
      return Math.min(100, Math.max(0, ((rawValue - 15) / (thresholds.red - 15)) * 100));

    case 'CREDIT_SPREAD':
      // Higher is riskier
      if (rawValue <= 3.0) return 10;
      if (rawValue >= thresholds.red) return 100;
      return Math.min(100, Math.max(0, ((rawValue - 3.0) / (thresholds.red - 3.0)) * 100));

    case 'SAHM_RULE':
      // Higher is riskier
      if (rawValue <= 0.0) return 0;
      if (rawValue >= thresholds.red) return 100;
      return Math.min(100, Math.max(0, (rawValue / thresholds.red) * 100));

    case 'NFCI':
      // Positive indicates tight financial conditions (higher risk)
      if (rawValue <= -0.5) return 10;
      if (rawValue >= thresholds.red) return 100;
      return Math.min(100, Math.max(0, ((rawValue - (-0.5)) / (thresholds.red - (-0.5))) * 100));

    case 'YIELD_CURVE':
      // Inverted (negative) or flattening is higher risk
      if (rawValue >= 0.5) return 0; // Healthy steepening
      if (rawValue <= thresholds.red) return 100; // Inverted
      return Math.min(100, Math.max(0, ((0.5 - rawValue) / (0.5 - thresholds.red)) * 100));

    case 'BREADTH':
      // Lower breadth is higher risk
      if (rawValue >= 70) return 0;
      if (rawValue <= thresholds.red) return 100;
      return Math.min(100, Math.max(0, ((70 - rawValue) / (70 - thresholds.red)) * 100));

    default:
      return 50;
  }
}

/**
 * Calculates the overall weighted market risk regime score (0-100).
 * @param {Object} latestValues Map of factor keys to current numeric values.
 * @returns {Object} Composite score, regime label, and factor breakdown.
 */
export function evaluateRiskRegime(latestValues) {
  let weightedScore = 0;
  let totalWeightApplied = 0;
  const factorBreakdown = {};

  Object.keys(FACTOR_WEIGHTS).forEach((key) => {
    const rawVal = latestValues[key];
    const weight = FACTOR_WEIGHTS[key];
    const factorScore = calculateFactorRiskScore(key, rawVal);

    factorBreakdown[key] = {
      rawValue: rawVal ?? 'N/A',
      factorRiskScore: Math.round(factorScore),
      weight: weight
    };

    weightedScore += factorScore * weight;
    totalWeightApplied += weight;
  });

  const finalCompositeScore = Math.round(weightedScore / totalWeightApplied);

  // Classify risk regime based on 0 - 100 composite score
  let overallRegime = 'LOW';
  if (finalCompositeScore >= 75) {
    overallRegime = 'EXTREME';
  } else if (finalCompositeScore >= 50) {
    overallRegime = 'HIGH';
  } else if (finalCompositeScore >= 25) {
    overallRegime = 'MODERATE';
  }

  return {
    compositeScore: finalCompositeScore,
    overallRegime,
    factorBreakdown
  };
}
