/**
 * Configuration for indicator thresholds, weights, and scoring rules.
 * Adjust weights so total max score sums to 9.0.
 */
export const INDICATOR_METRICS = {
  vix: {
    weight: 1.5, // Max 1.5 pts towards 9.0
    calcScore: (val) => {
      if (val >= 35) return 1.0;
      if (val <= 12) return 0.0;
      return (val - 12) / (35 - 12); // Continuous scale 0.0 - 1.0
    }
  },
  yield_curve: {
    weight: 2.0, // Max 2.0 pts towards 9.0
    calcScore: (val) => {
      if (val < -0.50) return 1.0;
      if (val > 0.50) return 0.0;
      return (0.50 - val) / (0.50 - (-0.50));
    }
  },
  credit_spread: {
    weight: 1.5, // Max 1.5 pts towards 9.0
    calcScore: (val) => {
      if (val >= 6.0) return 1.0;
      if (val <= 3.0) return 0.0;
      return (val - 3.0) / (6.0 - 3.0);
    }
  },
  sahm_rule: {
    weight: 1.5, // Max 1.5 pts towards 9.0
    calcScore: (val) => {
      if (val >= 0.50) return 1.0;
      if (val <= 0.0) return 0.0;
      return val / 0.50;
    }
  },
  nfci: {
    weight: 1.25, // Max 1.25 pts towards 9.0
    calcScore: (val) => {
      if (val >= 0.50) return 1.0;
      if (val <= -0.50) return 0.0;
      return (val - (-0.50)) / (0.50 - (-0.50));
    }
  },
  stlfsi: {
    weight: 1.25, // Max 1.25 pts towards 9.0
    calcScore: (val) => {
      if (val >= 1.5) return 1.0;
      if (val <= -1.0) return 0.0;
      return (val - (-1.0)) / (1.5 - (-1.0));
    }
  }
};

/**
 * Calculates raw score (0-9) and weighted score contribution for a specific indicator point
 */
export function evaluatePointRisk(indicatorId, rawValue) {
  const metric = INDICATOR_METRICS[indicatorId];
  if (!metric || rawValue === null || rawValue === undefined || isNaN(rawValue)) {
    return { score0to9: 0, weightedContribution: 0 };
  }

  const normalized = Math.min(1, Math.max(0, metric.calcScore(rawValue)));
  const score0to9 = normalized * 9.0;
  const weightedContribution = normalized * metric.weight;

  return {
    score0to9: parseFloat(score0to9.toFixed(1)),
    weightedContribution
  };
}

/**
 * Calculates total combined systemic risk score out of 9.0
 */
export function calculateAggregateRiskScore(latestIndicatorValues) {
  let totalScore = 0;

  Object.entries(latestIndicatorValues).forEach(([id, val]) => {
    const { weightedContribution } = evaluatePointRisk(id, val);
    totalScore += weightedContribution;
  });

  return parseFloat(Math.min(9.0, totalScore).toFixed(1));
}
