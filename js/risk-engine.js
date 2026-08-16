export const INDICATOR_METRICS = {
  yield_curve: { name: 'Yield Curve (10Y-2Y)' },
  credit_spread: { name: 'High Yield Spread' },
  bbb_spread: { name: 'BBB Corp Spread' },
  sahm_rule: { name: 'Sahm Rule' },
  nfci: { name: 'NFCI' },
  stlfsi: { name: 'St. Louis Financial Stress' },
  ted_spread: { name: 'TED Spread' },
  fed_liquidity: { name: 'Fed Total Assets' },
  consumer_sentiment: { name: 'Consumer Sentiment' },
  vix: { name: 'VIX' }
};

export function evaluatePointRisk(indicatorId, value) {
  if (value === null || value === undefined || isNaN(value)) {
    return { score0to9: 0 };
  }

  let score0to9 = 0;

  switch (indicatorId) {
    case 'yield_curve':
      // Inverted yield curve (< 0) signals high risk
      if (value < 0) score0to9 = 9.0;
      else if (value < 0.5) score0to9 = 5.0;
      else score0to9 = 1.0;
      break;

    case 'credit_spread':
    case 'bbb_spread':
      // Higher spreads = higher distress
      if (value > 6.0) score0to9 = 9.0;
      else if (value > 4.5) score0to9 = 6.0;
      else if (value > 3.5) score0to9 = 3.0;
      else score0to9 = 1.0;
      break;

    case 'sahm_rule':
      if (value >= 0.5) score0to9 = 9.0;
      else if (value >= 0.3) score0to9 = 5.0;
      else score0to9 = 0.0;
      break;

    case 'vix':
      if (value > 30) score0to9 = 9.0;
      else if (value > 20) score0to9 = 5.0;
      else score0to9 = 1.0;
      break;

    case 'nfci':
    case 'stlfsi':
      if (value > 1.0) score0to9 = 9.0;
      else if (value > 0.0) score0to9 = 5.0;
      else score0to9 = 1.0;
      break;

    case 'consumer_sentiment':
      if (value < 60) score0to9 = 9.0;
      else if (value < 75) score0to9 = 5.0;
      else score0to9 = 1.0;
      break;

    default:
      score0to9 = 2.0;
      break;
  }

  return { score0to9: Math.min(Math.max(score0to9, 0), 9.0) };
}

export function calculateAggregateRiskScore(latestValues) {
  const scores = [];
  Object.keys(latestValues).forEach(id => {
    const val = latestValues[id];
    if (val !== undefined && val !== null) {
      const { score0to9 } = evaluatePointRisk(id, val);
      scores.push(score0to9);
    }
  });

  if (scores.length === 0) return '0.0';

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return avg.toFixed(1);
}
