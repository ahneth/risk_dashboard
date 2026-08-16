export const INDICATOR_METRICS = {
  yield_curve: {
    name: "Yield Curve (10Y-2Y)",
    evaluate: (val) => {
      if (val < -0.5) return { score0to9: 9.0, status: "Critical Inversion" };
      if (val < 0.0) return { score0to9: 7.0, status: "Inverted" };
      if (val < 0.5) return { score0to9: 4.0, status: "Flattening" };
      return { score0to9: 0.0, status: "Normal" };
    }
  },
  credit_spread: {
    name: "High Yield Spread",
    evaluate: (val) => {
      if (val > 6.0) return { score0to9: 9.0, status: "Severe Stress" };
      if (val > 4.5) return { score0to9: 6.0, status: "Elevated" };
      if (val > 3.5) return { score0to9: 3.0, status: "Normal" };
      return { score0to9: 0.0, status: "Complacent" };
    }
  },
  bbb_spread: {
    name: "BBB Corp Spread",
    evaluate: (val) => {
      if (val > 3.0) return { score0to9: 9.0, status: "Severe Stress" };
      if (val > 2.2) return { score0to9: 6.0, status: "Elevated" };
      if (val > 1.7) return { score0to9: 3.0, status: "Normal" };
      return { score0to9: 0.0, status: "Tight" };
    }
  },
  sahm_rule: {
    name: "Sahm Rule",
    evaluate: (val) => {
      if (val >= 0.50) return { score0to9: 9.0, status: "Recession Triggered" };
      if (val >= 0.35) return { score0to9: 5.0, status: "Warning" };
      return { score0to9: 0.0, status: "Stable" };
    }
  },
  nfci: {
    name: "NFCI Financial Conditions",
    evaluate: (val) => {
      if (val > 0.5) return { score0to9: 9.0, status: "Tight" };
      if (val > 0.0) return { score0to9: 5.0, status: "Below Average" };
      if (val > -0.5) return { score0to9: 2.0, status: "Accommodative" };
      return { score0to9: 0.0, status: "Loose" };
    }
  },
  stlfsi: {
    name: "St. Louis Financial Stress",
    evaluate: (val) => {
      if (val > 2.0) return { score0to9: 9.0, status: "High Stress" };
      if (val > 0.5) return { score0to9: 6.0, status: "Elevated" };
      if (val > -0.5) return { score0to9: 2.0, status: "Normal" };
      return { score0to9: 0.0, status: "Loose" };
    }
  },
  ted_spread: {
    name: "3M Commercial Paper Rate",
    evaluate: (val) => {
      if (val > 5.5) return { score0to9: 8.0, status: "Tight Funding" };
      if (val > 3.5) return { score0to9: 4.0, status: "Normal" };
      return { score0to9: 1.0, status: "Low Rates" };
    }
  },
  fed_liquidity: {
    name: "Fed Total Assets YoY",
    evaluate: (val, historicalVals = []) => {
      return { score0to9: 2.0, status: "Monitored" };
    }
  },
  consumer_sentiment: {
    name: "Consumer Sentiment",
    evaluate: (val) => {
      if (val < 60) return { score0to9: 8.0, status: "Pessimistic" };
      if (val < 75) return { score0to9: 5.0, status: subdued = true, status: "Subdued" };
      return { score0to9: 1.0, status: "Confident" };
    }
  },
  vix: {
    name: "VIX Volatility",
    evaluate: (val) => {
      if (val > 30) return { score0to9: 9.0, status: "Panic" };
      if (val > 20) return { score0to9: 6.0, status: "Elevated Fear" };
      if (val > 15) return { score0to9: 3.0, status: "Normal" };
      return { score0to9: 1.0, status: "Complacent" };
    }
  }
};

export function evaluatePointRisk(indicatorId, value) {
  const metric = INDICATOR_METRICS[indicatorId];
  if (!metric || value === null || value === undefined || isNaN(value)) {
    return { score0to9: 0, status: 'N/A' };
  }
  return metric.evaluate(value);
}

export function calculateAggregateRiskScore(latestValues) {
  let totalScore = 0;
  let count = 0;

  for (const [id, val] of Object.entries(latestValues)) {
    if (val !== null && val !== undefined && !isNaN(val)) {
      const { score0to9 } = evaluatePointRisk(id, val);
      totalScore += score0to9;
      count++;
    }
  }

  if (count === 0) return '0.0';
  return (totalScore / count).toFixed(1);
}
