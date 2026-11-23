// Version: 2.0.1 | Last Modified: 2026-11-23 09:38 HKT
/*
  File: js/config.js
  Description: Single source of truth for FRED series IDs, indicator tiers, weights,
               and dashboard configuration shared between frontend and GitHub Actions.
  Change Log:
    - 2.0.1 (2026-11-23 09:38 HKT): Version sync for standalone GitHub repository package.
    - 2.0.0 (2026-11-23 08:41 HKT): Replaced lagging/mismatched series with daily market shock
      sensors (VXNCLS, NASDAQCOM, true HY OAS BAMLH0A0HYM2, DFII10, DTWEXBGS). Added
      tier weights and Shock Override thresholds.
    - 1.0.0 (2026-08-01 00:00 HKT): Initial FRED series configuration.
*/

// Single source of truth for all FRED series fetched by scripts/update-fred.mjs
export const SERIES_IDS = {
  // Tier 1: Fast / Near-Term Market Shock Sensors (Daily)
  vix: 'VIXCLS',            // CBOE S&P 500 Volatility Index
  vxn: 'VXNCLS',            // CBOE NASDAQ-100 Volatility Index (Tech/AI shock sensor)
  nasdaq_dd: 'NASDAQCOM',   // NASDAQ Composite Index (Drawdown & 5D momentum)
  sp500_dd: 'SP500',        // S&P 500 Index (Drawdown & 5D momentum)
  hy_spread: 'BAMLH0A0HYM2',// ICE BofA US High Yield OAS (True HY credit stress)
  real_yield: 'DFII10',     // 10-Year Real Interest Rate / TIPS (Valuation shock)
  usd_index: 'DTWEXBGS',    // Nominal Broad U.S. Dollar Index (Liquidity squeeze)

  // Tier 2: Slow / Structural Macro Regime Indicators (Daily / Weekly / Monthly)
  yield_curve: 'T10Y2Y',    // 10Y-2Y Treasury Spread
  sahm_rule: 'SAHMREALTIME',// Real-Time Sahm Rule Recession Indicator
  nfci: 'NFCI',             // Chicago Fed National Financial Conditions Index
  fed_liquidity: 'WALCL'    // Federal Reserve Total Assets (YoY % Change)
};

// Configurable weighting and Shock Override parameters
export const RISK_CONFIG = {
  FAST_WEIGHT: 0.65,                // Weight of Tier 1 (Fast Shock) sub-score
  SLOW_WEIGHT: 0.35,                // Weight of Tier 2 (Structural Macro) sub-score
  SHOCK_OVERRIDE_THRESHOLD: 6.0,    // If Fast sub-score >= 6.0, override composite floor
  RED_INDICATOR_SCORE: 7.0,         // Score threshold considered "Red / Acute Stress"
  RED_COUNT_OVERRIDE: 2,            // If >= 2 Fast indicators are Red, trigger Shock Override
  DEFAULT_TIMEFRAME_MONTHS: 12      // Default chart zoom window in months
};
