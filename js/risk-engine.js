// Version: 2.0.1 | Last Modified: 2026-11-23 09:38 HKT
/*
  File: js/risk-engine.js
  Description: Dual-speed risk scoring engine. Evaluates both absolute levels AND
               near-term velocity/drawdowns (5D, 10D, 20D, 252D) to detect sudden
               market shocks without being diluted by slow monthly macro indicators.
  Change Log:
    - 2.0.1 (2026-11-23 09:38 HKT): Version sync for standalone GitHub repository package.
    - 2.0.0 (2026-11-23 08:41 HKT): Complete overhaul. Added velocity/drawdown scoring for
      VIX, VXN, Nasdaq, S&P 500, High Yield OAS, Real Yields, and USD Index. Implemented
      real YoY % calculation for Fed Total Assets (WALCL) and Shock Override logic.
    - 1.0.0 (2026-08-01 00:00 HKT): Initial level-only scoring engine.
*/

import { RISK_CONFIG } from './config.js';

/**
 * Helper: Computes percentage change from `lookback` observations ago.
 */
function pctChange(pts, idx, lookback) {
  const prevIdx = Math.max(0, idx - lookback);
  if (idx === 0 || !pts[prevIdx] || pts[prevIdx].y === 0) return null;
  return ((pts[idx].y - pts[prevIdx].y) / Math.abs(pts[prevIdx].y)) * 100;
}

/**
 * Helper: Computes absolute difference from `lookback` observations ago.
 */
function absChange(pts, idx, lookback) {
  const prevIdx = Math.max(0, idx - lookback);
  if (idx === 0 || !pts[prevIdx]) return null;
  return pts[idx].y - pts[prevIdx].y;
}

/**
 * Helper: Computes drawdown (%) from the rolling high over the past `window` observations.
 */
function rollingDrawdown(pts, idx, window = 252) {
  const start = Math.max(0, idx - window);
  let peak = -Infinity;
  for (let i = start; i <= idx; i++) {
    if (pts[i].y > peak) peak = pts[i].y;
  }
  if (peak <= 0) return 0;
  return ((pts[idx].y - peak) / peak) * 100;
}

/**
 * Helper: Finds the observation closest to `daysAgo` calendar days prior to pts[idx].x.
 */
function valueDaysAgo(pts, idx, daysAgo) {
  const targetTime = new Date(`${pts[idx].x}T00:00:00Z`).getTime() - daysAgo * 86400000;
  let best = null;
  let minDiff = Infinity;
  for (let i = idx - 1; i >= 0; i--) {
    const t = new Date(`${pts[i].x}T00:00:00Z`).getTime();
    const diff = Math.abs(t - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      best = pts[i].y;
    }
    if (t < targetTime - 45 * 86400000) break;
  }
  return best;
}

/**
 * Metadata and evaluation rules for all Tier 1 (Fast) and Tier 2 (Slow) indicators.
 */
export const INDICATOR_METRICS = {
  vix: {
    tier: 'fast',
    name: 'CBOE Volatility (VIX)',
    description: 'S&P 500 30-day implied volatility. Scores both absolute fear level and sudden 5-day spikes.',
    legend: ['<15: Green', '15–22: Amber', '>22 or +25% 5D: Red'],
    unit: '',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      const chg5d = pctChange(pts, idx, 5) ?? 0;
      const levelScore = val > 30 ? 9.0 : val > 22 ? 7.0 : val > 16 ? 4.0 : 1.0;
      const shockScore = chg5d >= 35 ? 9.0 : chg5d >= 20 ? 7.0 : chg5d >= 12 ? 4.5 : 0;
      const score = Math.max(levelScore, shockScore);
      const tag = shockScore >= 7.0 ? `Spike +${chg5d.toFixed(0)}% (5D)` : (val > 22 ? 'Elevated Fear' : val > 16 ? 'Cautious' : 'Calm');
      return { score0to9: score, status: tag, subText: `5D: ${chg5d >= 0 ? '+' : ''}${chg5d.toFixed(1)}%` };
    }
  },

  vxn: {
    tier: 'fast',
    name: 'Nasdaq-100 Volatility (VXN)',
    description: 'Tech & AI sector implied volatility. Early warning sensor for mega-cap tech / semiconductor shocks.',
    legend: ['<20: Green', '20–26: Amber', '>26 or +25% 5D: Red'],
    unit: '',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      const chg5d = pctChange(pts, idx, 5) ?? 0;
      const levelScore = val > 34 ? 9.0 : val > 26 ? 7.0 : val > 20 ? 4.0 : 1.0;
      const shockScore = chg5d >= 30 ? 9.0 : chg5d >= 18 ? 7.0 : chg5d >= 10 ? 4.5 : 0;
      const score = Math.max(levelScore, shockScore);
      const tag = shockScore >= 7.0 ? `Tech Vol Spike +${chg5d.toFixed(0)}%` : (val > 26 ? 'Tech Stress' : val > 20 ? 'Elevated' : 'Calm');
      return { score0to9: score, status: tag, subText: `5D: ${chg5d >= 0 ? '+' : ''}${chg5d.toFixed(1)}%` };
    }
  },

  nasdaq_dd: {
    tier: 'fast',
    name: 'Nasdaq Drawdown & Velocity',
    description: 'Tracks NASDAQ Composite pullback from 52-week high and sharp 5-day sell-off velocity.',
    legend: ['DD > -3%: Green', '-3% to -8%: Amber', '<-8% or -4% 5D: Red'],
    unit: 'index',
    evaluate: (pts, idx) => {
      const dd = rollingDrawdown(pts, idx, 252);
      const chg5d = pctChange(pts, idx, 5) ?? 0;
      const ddScore = dd <= -15 ? 9.0 : dd <= -10 ? 7.5 : dd <= -5 ? 5.0 : dd <= -3 ? 3.0 : 0.5;
      const velScore = chg5d <= -6.0 ? 9.0 : chg5d <= -4.0 ? 7.5 : chg5d <= -2.5 ? 5.0 : 0;
      const score = Math.max(ddScore, velScore);
      const tag = velScore >= 7.5 ? `Free-Fall ${chg5d.toFixed(1)}% (5D)` : (dd <= -10 ? 'Correction' : dd <= -5 ? 'Pullback' : 'Uptrend');
      return { score0to9: score, status: tag, subText: `DD: ${dd.toFixed(1)}% | 5D: ${chg5d >= 0 ? '+' : ''}${chg5d.toFixed(1)}%` };
    }
  },

  sp500_dd: {
    tier: 'fast',
    name: 'S&P 500 Drawdown & Velocity',
    description: 'Tracks broad equity market drawdown from 52-week high and rapid 5-day liquidation.',
    legend: ['DD > -3%: Green', '-3% to -7%: Amber', '<-7% or -3.5% 5D: Red'],
    unit: 'index',
    evaluate: (pts, idx) => {
      const dd = rollingDrawdown(pts, idx, 252);
      const chg5d = pctChange(pts, idx, 5) ?? 0;
      const ddScore = dd <= -15 ? 9.0 : dd <= -8 ? 7.5 : dd <= -4 ? 4.5 : dd <= -2 ? 2.5 : 0.5;
      const velScore = chg5d <= -5.0 ? 9.0 : chg5d <= -3.5 ? 7.5 : chg5d <= -2.0 ? 4.5 : 0;
      const score = Math.max(ddScore, velScore);
      const tag = velScore >= 7.5 ? `Sell-Off ${chg5d.toFixed(1)}% (5D)` : (dd <= -8 ? 'Correction' : dd <= -4 ? 'Pullback' : 'Healthy');
      return { score0to9: score, status: tag, subText: `DD: ${dd.toFixed(1)}% | 5D: ${chg5d >= 0 ? '+' : ''}${chg5d.toFixed(1)}%` };
    }
  },

  hy_spread: {
    tier: 'fast',
    name: 'US High Yield Spread (OAS)',
    description: 'True ICE BofA High Yield credit spread. Rapid 10-day widening confirms equity shocks are spilling into credit.',
    legend: ['<3.5%: Green', '3.5–4.8%: Amber', '>4.8% or +50bps 10D: Red'],
    unit: '%',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      const chg10d = absChange(pts, idx, 10) ?? 0;
      const levelScore = val > 6.0 ? 9.0 : val > 4.8 ? 7.0 : val > 3.5 ? 3.5 : 1.0;
      const velScore = chg10d >= 0.75 ? 9.0 : chg10d >= 0.45 ? 7.0 : chg10d >= 0.25 ? 4.5 : 0;
      const score = Math.max(levelScore, velScore);
      const bps = Math.round(chg10d * 100);
      const tag = velScore >= 7.0 ? `Widening +${bps}bps` : (val > 4.8 ? 'Credit Stress' : 'Contained');
      return { score0to9: score, status: tag, subText: `10D: ${bps >= 0 ? '+' : ''}${bps} bps` };
    }
  },

  real_yield: {
    tier: 'fast',
    name: '10Y Real Yield (TIPS)',
    description: 'Inflation-adjusted 10-year yield. Rapid upward spikes compress tech/growth multiples and tighten liquidity.',
    legend: ['<1.8%: Green', '1.8–2.3%: Amber', '>2.3% or +30bps 20D: Red'],
    unit: '%',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      const chg20d = absChange(pts, idx, 20) ?? 0;
      const levelScore = val > 2.5 ? 8.0 : val > 2.2 ? 6.0 : val > 1.8 ? 3.5 : 1.0;
      const velScore = chg20d >= 0.40 ? 8.5 : chg20d >= 0.25 ? 6.5 : chg20d >= 0.15 ? 4.0 : 0;
      const score = Math.max(levelScore, velScore);
      const bps = Math.round(chg20d * 100);
      const tag = velScore >= 6.5 ? `Rate Shock +${bps}bps` : (val > 2.2 ? 'Restrictive' : 'Neutral');
      return { score0to9: score, status: tag, subText: `20D: ${bps >= 0 ? '+' : ''}${bps} bps` };
    }
  },

  usd_index: {
    tier: 'fast',
    name: 'Broad US Dollar Index',
    description: 'Trade-weighted USD. Sharp 20-day surges signal global dollar shortage and risk-off deleveraging.',
    legend: ['20D < +1.5%: Green', '+1.5–3.0%: Amber', '> +3.0% 20D: Red'],
    unit: '',
    evaluate: (pts, idx) => {
      const chg20d = pctChange(pts, idx, 20) ?? 0;
      const score = chg20d >= 3.5 ? 8.5 : chg20d >= 2.2 ? 6.5 : chg20d >= 1.2 ? 3.5 : 1.0;
      const tag = score >= 6.5 ? 'USD Squeeze' : score >= 3.5 ? 'Firming' : 'Stable';
      return { score0to9: score, status: tag, subText: `20D: ${chg20d >= 0 ? '+' : ''}${chg20d.toFixed(2)}%` };
    }
  },

  yield_curve: {
    tier: 'slow',
    name: 'Yield Curve (10Y - 2Y)',
    description: 'Classic recession predictor. Tracks both deep inversion and late-cycle rapid bull-steepening.',
    legend: ['>0.5%: Green', '0 to 0.5%: Amber', '<0%: Red'],
    unit: '%',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      if (val < -0.5) return { score0to9: 9.0, status: 'Deep Inversion', subText: 'Recession Signal' };
      if (val < 0.0) return { score0to9: 7.0, status: 'Inverted', subText: 'Warning Zone' };
      if (val < 0.4) return { score0to9: 3.5, status: 'Flat / Un-inverting', subText: 'Watch Steepening' };
      return { score0to9: 1.0, status: 'Normal', subText: 'Positive Slope' };
    }
  },

  sahm_rule: {
    tier: 'slow',
    name: 'Sahm Rule Recession',
    description: 'Monthly labor market trigger. Signals recession start when 3M avg unemployment rises >= 0.50% above 12M low.',
    legend: ['<0.30%: Green', '0.30–0.49%: Amber', '>=0.50%: Red'],
    unit: '%',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      if (val >= 0.50) return { score0to9: 9.0, status: 'Recession Triggered', subText: 'Threshold Breached' };
      if (val >= 0.30) return { score0to9: 5.0, status: 'Labor Softening', subText: 'Approaching 0.50%' };
      return { score0to9: 0.5, status: 'Stable Labor', subText: 'Below Warning' };
    }
  },

  nfci: {
    tier: 'slow',
    name: 'Financial Conditions (NFCI)',
    description: 'Chicago Fed weekly index across money markets, debt, equity, and shadow banking. > 0 means tighter than avg.',
    legend: ['<-0.4: Green', '-0.4 to 0.0: Amber', '>0.0: Red'],
    unit: '',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      if (val > 0.5) return { score0to9: 9.0, status: 'Tight / Stressed', subText: 'Above Historical Avg' };
      if (val > 0.0) return { score0to9: 6.0, status: 'Tightening', subText: 'Positive Territory' };
      if (val > -0.4) return { score0to9: 2.5, status: 'Neutral', subText: 'Slightly Loose' };
      return { score0to9: 0.5, status: 'Accommodative', subText: 'Loose Liquidity' };
    }
  },

  fed_liquidity: {
    tier: 'slow',
    name: 'Fed Total Assets (YoY)',
    description: 'Measures Federal Reserve balance sheet expansion (QE) or contraction (QT) over the trailing 12 months.',
    legend: ['YoY > +2%: Green', '-5% to +2%: Amber', 'YoY < -5%: Red'],
    unit: 'T',
    evaluate: (pts, idx) => {
      const val = pts[idx].y;
      const prevYearVal = valueDaysAgo(pts, idx, 365);
      if (!prevYearVal) {
        return { score0to9: 2.0, status: 'Insufficient YoY', subText: 'Need >1Y data' };
      }
      const yoy = ((val - prevYearVal) / prevYearVal) * 100;
      const score = yoy < -8.0 ? 7.5 : yoy < -4.0 ? 5.0 : yoy < 0.0 ? 3.0 : 1.0;
      const tag = yoy < -4.0 ? 'Active QT Drain' : yoy < 0 ? 'Mild Contraction' : 'Expanding';
      return { score0to9: score, status: tag, subText: `YoY: ${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%` };
    }
  }
};

/**
 * Evaluates a single indicator at a specific index in its clean chronological series.
 */
export function evaluateSeriesPoint(indicatorId, cleanPoints, index) {
  const metric = INDICATOR_METRICS[indicatorId];
  if (!metric || !cleanPoints || index < 0 || index >= cleanPoints.length) {
    return { score0to9: 0, status: 'N/A', subText: '' };
  }
  return metric.evaluate(cleanPoints, index);
}

/**
 * Calculates Fast Shock Sub-Score, Slow Macro Sub-Score, and Composite Risk Score with Shock Override.
 */
export function calculateDualSpeedRisk(scoreMap) {
  let fastSum = 0, fastCount = 0;
  let slowSum = 0, slowCount = 0;
  const redFastIds = [];

  for (const [id, score] of Object.entries(scoreMap)) {
    const metric = INDICATOR_METRICS[id];
    if (!metric || score === null || score === undefined || isNaN(score)) continue;

    if (metric.tier === 'fast') {
      fastSum += score;
      fastCount++;
      if (score >= RISK_CONFIG.RED_INDICATOR_SCORE) {
        redFastIds.push(metric.name);
      }
    } else {
      slowSum += score;
      slowCount++;
    }
  }

  const fastScore = fastCount > 0 ? fastSum / fastCount : 0;
  const slowScore = slowCount > 0 ? slowSum / slowCount : 0;

  let weighted = (fastScore * RISK_CONFIG.FAST_WEIGHT) + (slowScore * RISK_CONFIG.SLOW_WEIGHT);
  let shockOverride = false;

  if (fastScore >= RISK_CONFIG.SHOCK_OVERRIDE_THRESHOLD || redFastIds.length >= RISK_CONFIG.RED_COUNT_OVERRIDE) {
    shockOverride = true;
    const overrideFloor = Math.max(fastScore, redFastIds.length >= 3 ? 7.5 : 6.2);
    weighted = Math.max(weighted, overrideFloor);
  }

  return {
    composite: parseFloat(Math.min(9.0, weighted).toFixed(1)),
    fastScore: parseFloat(fastScore.toFixed(1)),
    slowScore: parseFloat(slowScore.toFixed(1)),
    shockOverride,
    redFastIds
  };
}
