/**
 * Configuration for indicator thresholds, weights, and scoring rules.
 * Total weights across all risk indicators sum up to exactly 9.0.
 */
export const INDICATOR_METRICS = {
  vix: {
    weight: 1.10,
    calcScore: (val) => {
      if (val >= 35) return 1.0;
      if (val <= 12) return 0.0;
      return (val - 12) / (35 - 12);
    }
  },
  yield_curve: {
    weight: 1.25,
    calcScore: (val) => {
      if (val < -0.50) return 1.0;
      if (val > 0.50) return 0.0;
      return (0.50 - val) / (0.50 - (-0.50));
    }
  },
  credit_spread: {
    weight: 1.10,
    calcScore: (val) => {
      if (val >= 6.0) return 1.0;
      if (val <= 3.0) return 0.0;
      return (val - 3.0) / (6.0 - 3.0);
    }
  },
  bbb_spread: {
    weight: 1.10,
    calcScore: (val) => {
      if (val >= 3.5) return 1.0;
      if (val <= 1.2) return 0.0;
      return (val - 1.2) / (3.5 - 1.2);
    }
  },
  sahm_rule: {
    weight: 1.10,
    calcScore: (val) => {
      if (val >= 0.50) return 1.0;
      if (val <= 0.0) return 0.0;
      return val / 0.50;
    }
  },
  nfci: {
    weight: 0.85,
    calcScore: (val) => {
      if (val >= 0.50) return 1.0;
      if (val <= -0.50) return 0.0;
      return (val - (-0.50)) / (0.50 - (-0.50));
    }
  },
  stlfsi: {
    weight: 0.85,
    calcScore: (val) => {
      if (val >= 1.5) return 1.0;
      if (val <= -1.0) return 0.0;
      return (val - (-1.0)) / (1.5 - (-1.0));
    }
  },
  ted_spread: {
    weight: 0.75,
    calcScore: (val) => {
      if (val >= 1.50) return 1.0;
      if (val <= 0.20) return 0.0;
      return (val - 0.20) / (1.50 - 0.20);
    }
  },
  fed_liquidity: {
    weight: 0.50,
    calcScore: (val) => {
      // Using balance sheet level as proxy: lower total assets / aggressive QT = higher risk score
      // Normalized baseline roughly between 6.5T (stressed drain) and 9.0T (peak expansion)
      if (val <= 6500000) return 1.0;
      if (val >= 8900000) return 0.0;
      return (8900000 - val) / (8900000 - 6500000);
    }
  },
  consumer_sentiment: {
    weight: 0.50,
    calcScore: (val) => {
      if (val <= 55) return 1.0;
      if (val >= 90) return 0.0;
      return (90 - val) / (90 - 55);
    }
  }
};

/**
 * Calculates raw score (0-9) and weighted contribution for a specific indicator point
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
